const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { MercadoPagoConfig, PreApproval, PreApprovalPlan } = require("mercadopago");

admin.initializeApp();
const db = admin.firestore();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_PUBLIC_KEY   = process.env.MP_PUBLIC_KEY;

const PLANS = {
  emprendedor: { name: "Genesys App — Pequeño Emprendedor", amount: 20000 },
  pyme:        { name: "Genesys App — Plan Pyme",           amount: 35000 },
  empresa:     { name: "Genesys App — Plan Empresa",        amount: 60000 },
};

// ── Crear plan en MP si no existe ─────────────────────────────────────
async function getOrCreatePlan(planKey) {
  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  const planApi = new PreApprovalPlan(mp);

  const planDoc = await db.collection("mp_plans").doc(planKey).get();
  if (planDoc.exists) return planDoc.data().planId;

  const plan = await planApi.create({
    body: {
      reason: PLANS[planKey].name,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLANS[planKey].amount,
        currency_id: "ARS",
      },
      back_url: "https://app.genesys.com.ar",
      status: "active",
    },
  });

  await db.collection("mp_plans").doc(planKey).set({ planId: plan.id });
  return plan.id;
}

// ── 1. Registrar nuevo negocio ─────────────────────────────────────────
exports.registerBusiness = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { email, password, businessName, plan = 'emprendedor' } = req.body;

  if (!email || !password || !businessName) {
    res.status(400).json({ error: 'Faltan datos requeridos' }); return;
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: businessName });
    const uid = userRecord.uid;

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await db.collection('users').doc(uid).set({
      name: businessName, email, role: 'admin',
      businessId: uid, active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('businesses').doc(uid).set({
      name: businessName, plan, status: 'trial', trialEnd,
      currency: 'ARS', lowStockThreshold: 3, defaultWarrantyDays: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true, uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 2. Crear suscripción en MP (genera link de pago) ──────────────────
exports.createSubscription = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debés estar logueado");

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const user = userDoc.data();
  const bizDoc = await db.collection("businesses").doc(user.businessId).get();
  if (!bizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const biz = bizDoc.data();
  const planKey = biz.plan || "emprendedor";

  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  const preApproval = new PreApproval(mp);

  const planId = await getOrCreatePlan(planKey);

  const sub = await preApproval.create({
    body: {
      preapproval_plan_id: planId,
      reason: PLANS[planKey].name,
      payer_email: user.email,
      back_url: "https://app.genesys.com.ar",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLANS[planKey].amount,
        currency_id: "ARS",
      },
      status: "pending",
    },
  });

  await db.collection("businesses").doc(user.businessId).update({
    mpSubscriptionId: sub.id,
    mpPlanKey: planKey,
    status: "pending_payment",
  });

  return {
    subscriptionId: sub.id,
    initPoint: sub.init_point,
  };
});

// ── 3. Webhook de MercadoPago ──────────────────────────────────────────
exports.mpWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

  const { type, data } = req.body;
  if (type !== "subscription_preapproval") { res.status(200).send("ok"); return; }

  try {
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(mp);
    const sub = await preApproval.get({ id: data.id });

    const bizSnap = await db.collection("businesses")
      .where("mpSubscriptionId", "==", sub.id)
      .limit(1)
      .get();

    if (bizSnap.empty) { res.status(200).send("ok"); return; }

    const bizRef = bizSnap.docs[0].ref;
    const mpStatus = sub.status;

    let newStatus = "active";
    if (mpStatus === "paused" || mpStatus === "cancelled") newStatus = "suspended";
    if (mpStatus === "authorized") newStatus = "active";

    await bizRef.update({
      status: newStatus,
      mpStatus,
      lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send("ok");
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(500).send("error");
  }
});

// ── 4. Chequear trials expirados ───────────────────────────────────────
exports.checkTrials = onRequest(async (req, res) => {
  const now = new Date();

  const snap = await db.collection("businesses")
    .where("status", "==", "trial")
    .where("trialEnd", "<=", now)
    .get();

  const batch = db.batch();
  snap.docs.forEach(doc => batch.update(doc.ref, { status: "suspended" }));
  await batch.commit();

  res.status(200).json({ suspended: snap.size });
});

// ── 5. Estado del negocio ──────────────────────────────────────────────
exports.getBusinessStatus = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "No autenticado");

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const bizDoc = await db.collection("businesses").doc(userDoc.data().businessId).get();
  if (!bizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const biz = bizDoc.data();
  const now = new Date();

  let trialDaysLeft = 0;
  if (biz.status === "trial" && biz.trialEnd) {
    const trialEnd = biz.trialEnd.toDate ? biz.trialEnd.toDate() : new Date(biz.trialEnd);
    trialDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
  }

  return {
    status: biz.status,
    plan: biz.mpPlanKey || biz.plan,
    trialDaysLeft,
    mpPublicKey: MP_PUBLIC_KEY,
  };
});

// ── 6. Generar link de pago cuando vence el trial ─────────────────────
exports.getPaymentLink = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "No autenticado");

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const user = userDoc.data();
  const bizDoc = await db.collection("businesses").doc(user.businessId).get();
  if (!bizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const biz = bizDoc.data();

  // Si ya tiene suscripción pendiente, devolver el mismo link
  if (biz.mpSubscriptionId && biz.status === "pending_payment") {
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(mp);
    try {
      const sub = await preApproval.get({ id: biz.mpSubscriptionId });
      if (sub.init_point) {
        return { initPoint: sub.init_point, plan: biz.plan };
      }
    } catch (e) {
      // Si falla, crear una nueva
    }
  }

  const planKey = biz.plan || "emprendedor";
  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  const preApproval = new PreApproval(mp);
  const planId = await getOrCreatePlan(planKey);

  const sub = await preApproval.create({
    body: {
      preapproval_plan_id: planId,
      reason: PLANS[planKey].name,
      payer_email: user.email,
      back_url: "https://app.genesys.com.ar",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLANS[planKey].amount,
        currency_id: "ARS",
      },
      status: "pending",
    },
  });

  await db.collection("businesses").doc(user.businessId).update({
    mpSubscriptionId: sub.id,
    mpPlanKey: planKey,
    status: "pending_payment",
  });

  return {
    initPoint: sub.init_point,
    plan: planKey,
    amount: PLANS[planKey].amount,
  };
});