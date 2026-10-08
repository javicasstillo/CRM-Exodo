const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { MercadoPagoConfig, PreApproval, PreApprovalPlan } = require("mercadopago");
const { Resend } = require('resend');

admin.initializeApp();
const db = admin.firestore();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_PUBLIC_KEY   = process.env.MP_PUBLIC_KEY;
const RESEND_API_KEY  = process.env.RESEND_API_KEY;

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
      onboardingCompleted: false,
      trialEnd: tieneTrial ? trialEnd : null,
      currency: 'ARS',
      lowStockThreshold: 3,
      defaultWarrantyDays: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: 'Genesys App <hola@genesys.com.ar>',
        to: email,
        subject: '¡Bienvenido a Genesys App! 🎉',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#0f1729">
            <div style="text-align:center;margin-bottom:32px">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:900;color:#0d6efd;letter-spacing:-0.5px">Genesys <span style="color:#0f1729">App</span></div>
              <div style="font-size:12px;color:#7b8ab8;margin-top:4px;letter-spacing:1px;text-transform:uppercase">Sistema de gestión</div>
            </div>
            <div style="background:linear-gradient(135deg,#0d6efd,#1a56db);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;color:#fff">
              <div style="font-size:36px;margin-bottom:12px">🎉</div>
              <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">¡Tu cuenta está lista!</h1>
              <p style="font-size:15px;opacity:0.85;margin:0">Bienvenido a <strong>${businessName}</strong></p>
            </div>
            <p style="font-size:15px;line-height:1.7;color:#3d4e72;margin-bottom:20px">
              Hola, tu sistema de gestión ya está activo. Podés empezar a cargar tu stock, registrar ventas y controlar tu negocio desde un solo lugar.
            </p>
            <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #dde3f0">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7b8ab8;margin-bottom:12px">Tu cuenta</div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dde3f0;font-size:13px">
                <span style="color:#7b8ab8">Negocio</span><strong style="color:#0f1729">${businessName}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dde3f0;font-size:13px">
                <span style="color:#7b8ab8">Email</span><strong style="color:#0f1729">${email}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px">
                <span style="color:#7b8ab8">Plan</span><strong style="color:#0d6efd;text-transform:capitalize">${plan}</strong>
              </div>
            </div>
            <div style="text-align:center;margin-bottom:32px">
              <a href="https://app.genesys.com.ar" style="display:inline-block;background:#0d6efd;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;box-shadow:0 4px 20px rgba(13,110,253,0.3)">
                Ingresar al sistema →
              </a>
            </div>
            <div style="border-top:1px solid #dde3f0;padding-top:20px;text-align:center;font-size:12px;color:#7b8ab8">
              <p style="margin:0">¿Necesitás ayuda? Escribinos por <a href="https://api.whatsapp.com/send?phone=2604104160" style="color:#0d6efd;text-decoration:none">WhatsApp</a></p>
              <p style="margin:8px 0 0">© 2026 Genesys App · San Rafael, Mendoza</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Error enviando email:', emailErr);
    }

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
  const planId = await getOrCreatePlan(planKey);

  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  const planApi2 = new PreApprovalPlan(mp);
  const planData = await planApi2.get({ id: planId });

  const initPoint = planData.init_point || `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${planId}`;

  await db.collection("businesses").doc(user.businessId).update({
    mpPlanKey: planKey,
    status: "pending_payment",
  });

  return { initPoint, plan: planKey, amount: PLANS[planKey].amount };
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

    if (newStatus === 'active') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const bizData = bizSnap.docs[0].data();
        await resend.emails.send({
          from: 'Genesys App <hola@genesys.com.ar>',
          to: 'javiercastillo.tuc@gmail.com',
          subject: '💰 Nuevo pago recibido — Genesys App',
          html: `
            <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f1729">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:900;color:#0d6efd;margin-bottom:24px">
                Genesys <span style="color:#0f1729">App</span>
              </div>
              <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:14px;padding:24px;color:#fff;margin-bottom:24px;text-align:center">
                <div style="font-size:36px;margin-bottom:8px">💰</div>
                <div style="font-size:20px;font-weight:800;margin-bottom:4px">¡Nuevo pago recibido!</div>
                <div style="font-size:13px;opacity:0.85">Un cliente activó su suscripción</div>
              </div>
              <div style="background:#f8f9fc;border-radius:12px;padding:18px 20px;border:1px solid #dde3f0">
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dde3f0;font-size:13px">
                  <span style="color:#7b8ab8">Negocio</span><strong>${bizData.name || '—'}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dde3f0;font-size:13px">
                  <span style="color:#7b8ab8">Plan</span><strong style="color:#0d6efd;text-transform:capitalize">${bizData.plan || '—'}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px">
                  <span style="color:#7b8ab8">Estado</span><strong style="color:#16a34a">Activo ✓</strong>
                </div>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Error enviando notificación de pago:', emailErr);
      }
    }

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
  const planKey = biz.plan || "emprendedor";
  const planId = await getOrCreatePlan(planKey);
  const initPoint = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${planId}`;

  await db.collection("businesses").doc(user.businessId).update({
    mpPlanKey: planKey,
    status: "pending_payment",
  });

  return { initPoint, plan: planKey, amount: PLANS[planKey].amount };
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
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (usersSnap.empty) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    const user = usersSnap.docs[0].data();
    const planId = await getOrCreatePlan(plan);

    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(mp);

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

// ── 10. Cambiar plan ───────────────────────────────────────────────────
exports.changePlan = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "No autenticado");

  const { newPlan } = request.data;
  if (!newPlan || !PLANS[newPlan]) throw new HttpsError("invalid-argument", "Plan inválido");

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const user = userDoc.data();
  const bizDoc = await db.collection("businesses").doc(user.businessId).get();
  if (!bizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const biz = bizDoc.data();

  if (biz.plan === newPlan) throw new HttpsError("invalid-argument", "Ya estás en ese plan");

  // Cancelar suscripción anterior en MP si existe
  if (biz.mpSubscriptionId) {
    try {
      const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
      const preApproval = new PreApproval(mp);
      await preApproval.update({
        id: biz.mpSubscriptionId,
        body: { status: "cancelled" },
      });
    } catch (e) {
      console.error('Error cancelando suscripción anterior:', e);
      // Continuamos igual aunque falle la cancelación en MP
    }
  }

  // Generar link de pago para el nuevo plan
  const planId = await getOrCreatePlan(newPlan);
  const initPoint = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${planId}`;

  // Actualizar el plan en Firestore (el status queda pending_payment hasta que MP confirme)
  await db.collection("businesses").doc(user.businessId).update({
    plan: newPlan,
    mpPlanKey: newPlan,
    status: "pending_payment",
    planChangedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    initPoint,
    plan: newPlan,
    amount: PLANS[newPlan].amount,
  };
});
