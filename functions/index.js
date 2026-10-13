const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { MercadoPagoConfig, PreApproval, PreApprovalPlan } = require("mercadopago");
const { Resend } = require('resend');
const { getGTIN } = require('./gtin_table');

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

// ── 11. Crear sucursal ─────────────────────────────────────────────────
exports.createBranch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "No autenticado");

  const { branchName, adminEmail, adminPassword, adminName } = request.data;
  if (!branchName || !adminEmail || !adminPassword || !adminName) {
    throw new HttpsError("invalid-argument", "Faltan datos requeridos");
  }

  // Verificar que el negocio maestro sea plan Empresa
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  const masterUser = userDoc.data();
  const masterBizDoc = await db.collection("businesses").doc(masterUser.businessId).get();
  if (!masterBizDoc.exists) throw new HttpsError("not-found", "Negocio no encontrado");

  const masterBiz = masterBizDoc.data();
  if (masterBiz.plan !== 'empresa') {
    throw new HttpsError("permission-denied", "Las sucursales solo están disponibles en el plan Empresa");
  }

  try {
    // Crear usuario admin de la sucursal en Firebase Auth
    const newUser = await admin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    });

    const branchId = newUser.uid;

    // Crear perfil del usuario admin de la sucursal
    await db.collection("users").doc(branchId).set({
      name: adminName,
      email: adminEmail,
      role: 'admin',
      businessId: branchId,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear el negocio de la sucursal vinculado al maestro
    await db.collection("businesses").doc(branchId).set({
      name: branchName,
      plan: 'empresa',
      status: 'active',
      parentBusinessId: masterUser.businessId, // vínculo al maestro
      masterAdminId: uid,
      currency: masterBiz.currency || 'ARS',
      lowStockThreshold: masterBiz.lowStockThreshold || 3,
      defaultWarrantyDays: masterBiz.defaultWarrantyDays || 30,
      whatsapp: '',
      onboardingCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Registrar la sucursal en el negocio maestro
    await db.collection("businesses").doc(masterUser.businessId).update({
      branches: admin.firestore.FieldValue.arrayUnion({
        id: branchId,
        name: branchName,
        adminEmail,
        adminName,
        createdAt: new Date().toISOString(),
      }),
    });

    // Enviar email de bienvenida al admin de la sucursal
    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: 'Genesys App <hola@genesys.com.ar>',
        to: adminEmail,
        subject: `Acceso a ${branchName} — Genesys App`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#0f1729">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:900;color:#0d6efd;margin-bottom:24px">
              Genesys <span style="color:#0f1729">App</span>
            </div>
            <p style="font-size:15px;line-height:1.7;color:#3d4e72;margin-bottom:20px">
              Hola <strong>${adminName}</strong>, se creó tu acceso como administrador de <strong>${branchName}</strong>.
            </p>
            <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #dde3f0">
              <div style="font-size:13px;margin-bottom:8px"><strong>Email:</strong> ${adminEmail}</div>
              <div style="font-size:13px"><strong>Contraseña:</strong> ${adminPassword}</div>
            </div>
            <div style="text-align:center">
              <a href="https://app.genesys.com.ar" style="display:inline-block;background:#0d6efd;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;">
                Ingresar al sistema →
              </a>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Error enviando email sucursal:', emailErr);
    }

    return { success: true, branchId, branchName };
  } catch (e) {
    throw new HttpsError("internal", e.message);
  }
});

// ── Agregar al inicio del archivo, junto a las otras constantes ────────
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_SECRET    = process.env.ML_SECRET;
const ML_REDIRECT  = 'https://app.genesys.com.ar/ml-callback';

// ── Helper: obtener token de ML vigente (refresca si expiró) ──────────
async function getMLToken(businessId) {
  const doc = await db.collection('ml_tokens').doc(businessId).get();
  if (!doc.exists) throw new Error('No hay cuenta de ML conectada');

  const data = doc.data();
  const now = Date.now();

  // Si el token expira en menos de 5 minutos, lo refrescamos
  if (data.expiresAt - now < 5 * 60 * 1000) {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     ML_CLIENT_ID,
        client_secret: ML_SECRET,
        refresh_token: data.refreshToken,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`ML refresh error: ${json.message}`);

    const updated = {
      accessToken:  json.access_token,
      refreshToken: json.refresh_token,
      expiresAt:    now + json.expires_in * 1000,
      mlUserId:     json.user_id,
    };
    await db.collection('ml_tokens').doc(businessId).update(updated);
    return updated.accessToken;
  }

  return data.accessToken;
}

// ── 12. Generar URL de autorización de ML ─────────────────────────────
exports.mlAuthUrl = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'No autenticado');

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado');
  const businessId = userDoc.data().businessId;

  const url = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT)}&state=${businessId}`;
  return { url };
});

// ── 13. Callback de ML (recibe el code y guarda el token) ─────────────
exports.mlCallback = onRequest(async (req, res) => {
  const { code, state: businessId } = req.query;

  if (!code || !businessId) {
    res.redirect('https://app.genesys.com.ar?ml=error');
    return;
  }

  try {
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     ML_CLIENT_ID,
        client_secret: ML_SECRET,
        code,
        redirect_uri:  ML_REDIRECT,
      }),
    });

    const token = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(token.message);

    await db.collection('ml_tokens').doc(businessId).set({
      accessToken:  token.access_token,
      refreshToken: token.refresh_token,
      expiresAt:    Date.now() + token.expires_in * 1000,
      mlUserId:     token.user_id,
      connectedAt:  admin.firestore.FieldValue.serverTimestamp(),
    });

    // Marcar el negocio como conectado a ML
    await db.collection('businesses').doc(businessId).update({
      mlConnected: true,
      mlUserId: token.user_id,
    });

    res.redirect('https://app.genesys.com.ar?ml=success');
  } catch (e) {
    console.error('ML callback error:', e);
    res.redirect('https://app.genesys.com.ar?ml=error');
  }
});

// ── 14. Publicar producto en ML ────────────────────────────────────────
exports.mlPublicarProducto = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'No autenticado');

  const { phoneId, categoryId, precio, condicion, descripcion, gtin } = request.data;
  // condicion: 'new' | 'used'
  // categoryId: categoría de ML (ej: MLA1055 para celulares)
  console.log('gtin recibido:', gtin);

  if (!phoneId || !categoryId || !precio || !condicion) {
    throw new HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado');
  const businessId = userDoc.data().businessId;

  // Obtener datos del producto
  const phoneDoc = await db.collection('phones').doc(phoneId).get();
  if (!phoneDoc.exists) throw new HttpsError('not-found', 'Producto no encontrado');
  const phone = phoneDoc.data();

  try {
    const accessToken = await getMLToken(businessId);

    // Subir foto a imgbb si el producto tiene foto en base64
// Subir foto a imgbb si el producto tiene foto en base64
let mlPictures = [];
if (phone.photo && phone.photo.startsWith('data:image')) {
  try {
    const base64Data = phone.photo.split(',')[1];
    const formData = new FormData();
    formData.append('image', base64Data);
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });
    const imgbbData = await imgbbRes.json();
    if (imgbbData.success) {
      mlPictures = [{ source: imgbbData.data.url }];
    } else {
      console.error('imgbb error:', JSON.stringify(imgbbData));
    }
  } catch (e) {
    console.error('Error subiendo foto a imgbb:', e);
  }
}

console.log('mlPictures:', JSON.stringify(mlPictures));

    // Construir título del producto
    const titulo = phone.model
  .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
  .trim()
  .slice(0, 60);

const body = {
  family_name: titulo,
  category_id: categoryId,
  price: Number(precio),
  currency_id: 'ARS',
  available_quantity: Number(phone.quantity) || 1,
  buying_mode: 'buy_it_now',
  condition: condicion,
  listing_type_id: 'bronze',
  description: { plain_text: descripcion || `${titulo} en perfectas condiciones.` },
  sale_terms: [
    { id: 'WARRANTY_TYPE', value_name: 'Garantía del vendedor' },
    { id: 'WARRANTY_TIME', value_name: '90 días' },
  ],
  attributes: [
  { id: 'BRAND', value_name: phone.model.includes('iPhone') || phone.model.includes('AirPods') || phone.model.includes('Apple') ? 'Apple' : phone.model.split(' ')[0] },
  { id: 'MODEL', value_name: phone.model },
  ...(categoryId === 'MLA1055' ? [
  { id: 'FAMILY_NAME', value_name: phone.model },
  { id: 'IS_DUAL_SIM', value_id: '242084' },
  { id: 'CARRIER', value_id: '298335' },
  ...(gtin 
  ? [{ id: 'GTIN', value_name: gtin }]
  : phone.model.includes('iPhone') && getGTIN(phone.model)
    ? [{ id: 'GTIN', value_name: getGTIN(phone.model) }]
    : [{ id: 'EMPTY_GTIN_REASON', value_id: '17055161' }]),
] : []),
  { id: 'COLOR', value_name: phone.color || 'Negro' },
  ...(phone.storage && phone.storage !== 'N/A' ? [{ id: 'INTERNAL_MEMORY', value_name: phone.storage.replace('GB', ' GB').trim() }] : []),
],
  ...(mlPictures.length > 0 ? { pictures: mlPictures } : {}),
};

    console.log('ML body:', JSON.stringify(body));
    const mlRes = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const mlData = await mlRes.json();
    if (!mlRes.ok) {
  console.error('ML API error:', JSON.stringify(mlData));
  throw new Error(JSON.stringify(mlData));
}

    // Guardar el ID de ML en el producto de Genesys
    await db.collection('phones').doc(phoneId).update({
      mlItemId:  mlData.id,
      mlStatus:  mlData.status,
      mlUrl:     mlData.permalink,
      mlPublishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, mlItemId: mlData.id, mlUrl: mlData.permalink };
  } catch (e) {
    throw new HttpsError('internal', e.message);
  }
});

// ── 15. Webhook de ML (notificaciones de ventas y cambios) ────────────
exports.mlWebhook = onRequest(async (req, res) => {
  // ML hace GET para validar la URL
  if (req.method === 'GET') { res.status(200).send('ok'); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { topic, resource } = req.body;
  res.status(200).send('ok'); // Responder rápido a ML

  try {
    if (topic === 'orders_v2' || topic === 'orders') {
      // Obtener la orden de ML
      const orderId = resource.replace('/orders/', '');

      // Buscar el negocio que tiene este token
      const tokensSnap = await db.collection('ml_tokens').get();

      for (const tokenDoc of tokensSnap.docs) {
        const businessId = tokenDoc.id;
        try {
          const accessToken = await getMLToken(businessId);

          const orderRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });

          if (!orderRes.ok) continue;
          const order = await orderRes.json();

          if (order.status !== 'paid') continue;

          // Buscar el producto en Genesys por mlItemId
          for (const item of order.order_items) {
            const mlItemId = item.item.id;

            const phonesSnap = await db.collection('phones')
              .where('businessId', '==', businessId)
              .where('mlItemId', '==', mlItemId)
              .limit(1)
              .get();

            if (phonesSnap.empty) continue;

            const phoneDoc = phonesSnap.docs[0];
            const phone = phoneDoc.data();
            const qty = Number(phone.quantity) || 1;

            // Descontar stock
            if (qty > 1) {
              await phoneDoc.ref.update({ quantity: qty - 1, mlStatus: 'active' });
            } else {
              await phoneDoc.ref.update({ status: 'vendido', quantity: 0, mlStatus: 'closed' });
            }

            console.log(`ML venta procesada: ${mlItemId} para negocio ${businessId}`);
          }
        } catch (tokenErr) {
          // Este negocio no tiene token válido, skip
          continue;
        }
      }
    }
  } catch (e) {
    console.error('ML webhook error:', e);
  }
});


