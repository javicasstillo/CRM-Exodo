const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
    trialEnd.setDate(trialEnd.getDate() + 7);

    await db.collection('users').doc(uid).set({
      name: businessName, email, role: 'admin',
      businessId: uid, active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const planesConTrial = ['emprendedor'];
const tieneTrial = planesConTrial.includes(plan);

await db.collection('businesses').doc(uid).set({
  name: businessName,
  plan,
  status: tieneTrial ? 'trial' : 'pending_payment',
  trialEnd: tieneTrial ? trialEnd : null,
  currency: 'ARS',
  lowStockThreshold: 3,
  defaultWarrantyDays: 30,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

    res.status(200).json({ success: true, uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 2. Crear suscripción en MP ─────────────────────────────────────────
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

// ── 4. Chequear trials expirados manualmente ───────────────────────────
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

// ── 5. Chequear trials expirados automáticamente (cron diario) ────────
exports.checkTrialsScheduled = onSchedule("every 24 hours", async () => {
  const now = new Date();
  const snap = await db.collection("businesses")
    .where("status", "==", "trial")
    .where("trialEnd", "<=", now)
    .get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.update(doc.ref, { status: "suspended" }));
  await batch.commit();
  console.log(`Trials vencidos suspendidos: ${snap.size}`);
});

// ── 6. Estado del negocio ──────────────────────────────────────────────
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

// ── 7. Generar link de pago cuando vence el trial ─────────────────────
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

// ── 8. Cancelar suscripción ────────────────────────────────────────────
exports.cancelSubscription = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "No autenticado");

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const user = userDoc.data();
  const bizDoc = await db.collection("businesses").doc(user.businessId).get();
  if (!bizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const biz = bizDoc.data();

  if (!biz.mpSubscriptionId) {
    throw new HttpsError("failed-precondition", "No hay suscripción activa");
  }

  try {
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(mp);

    await preApproval.update({
      id: biz.mpSubscriptionId,
      body: { status: "cancelled" },
    });

    await db.collection("businesses").doc(user.businessId).update({
      status: "suspended",
      mpStatus: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (e) {
    throw new HttpsError("internal", e.message);
  }
});

// ── 9. Link de pago público (para registro sin trial) ─────────────────
exports.createPaymentLinkPublic = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { email, plan = 'pyme' } = req.body;

  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  try {
    // Buscar el negocio por email
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (usersSnap.empty) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    const user = usersSnap.docs[0].data();
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(mp);
    const planId = await getOrCreatePlan(plan);

    const sub = await preApproval.create({
      body: {
        preapproval_plan_id: planId,
        reason: PLANS[plan].name,
        payer_email: email,
        back_url: 'https://app.genesys.com.ar',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PLANS[plan].amount,
          currency_id: 'ARS',
        },
        status: 'pending',
      },
    });

    // Actualizar el negocio con la suscripción
    await db.collection('businesses').doc(user.businessId).update({
      mpSubscriptionId: sub.id,
      mpPlanKey: plan,
      status: 'pending_payment',
    });

    res.status(200).json({ initPoint: sub.init_point });
  } catch (e) {
    console.error('createPaymentLinkPublic error:', e);
    res.status(500).json({ error: e.message });
  }
});