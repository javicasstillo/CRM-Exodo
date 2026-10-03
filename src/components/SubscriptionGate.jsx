import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { logout } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AlertTriangle, CreditCard, Clock, ExternalLink } from 'lucide-react';

const PLAN_LABELS = {
  emprendedor: 'Pequeño Emprendedor — $20.000/mes',
  pyme:        'Pyme — $35.000/mes',
  empresa:     'Empresa — $60.000/mes',
};

export default function SubscriptionGate({ children }) {
  const { subStatus, trialDays, business, profile } = useApp();
  const [paymentLink, setPaymentLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

     const fetchPaymentLink = async (autoOpen = false) => {
    setLoadingLink(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const getPaymentLink = httpsCallable(functions, 'getPaymentLink');
      const result = await getPaymentLink();
      const link = result.data.initPoint;
      setPaymentLink(link);
      if (autoOpen && link) window.open(link, '_blank');
    } catch (e) {
      console.error('Error obteniendo link de pago:', e);
    } finally {
      setLoadingLink(false);
    }
  };

  useEffect(() => {
  if (subStatus === 'suspended' || subStatus === 'pending_payment') {
    fetchPaymentLink(true);
  }
}, [subStatus]);

  // Trial activo — banner de aviso cuando quedan 5 días o menos
  if (subStatus === 'trial') {
    return (
      <>
        {trialDays !== null && trialDays <= 5 && (
          <div style={{
            background: trialDays <= 2 ? '#fff1f1' : '#fffbeb',
            borderBottom: `1px solid ${trialDays <= 2 ? '#fecaca' : '#fde68a'}`,
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: trialDays <= 2 ? '#dc2626' : '#92400e' }}>
              <Clock size={15} />
              <span>
                {trialDays === 0
                  ? '⚠️ Tu período de prueba vence hoy'
                  : `Tu período de prueba vence en ${trialDays} día${trialDays !== 1 ? 's' : ''}`
                }
              </span>
            </div>
                        <button
              onClick={() => paymentLink ? window.open(paymentLink, '_blank') : fetchPaymentLink(true)}
              disabled={loadingLink}
              style={{
                background: '#0d6efd', color: '#fff',
                padding: '6px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <CreditCard size={13} />
              {loadingLink ? 'Cargando...' : 'Activar suscripción'}
            </button>
            {paymentLink && (
              <a href={paymentLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'none' }} id="mp-payment-link" />
            )}
          </div>
        )}
        {paymentLink && (
          <script dangerouslySetInnerHTML={{ __html: `window.open('${paymentLink}', '_blank')` }} />
        )}
        {children}
      </>
    );
  }

  // Activo — acceso total
  if (subStatus === 'active') return children;

  // Suspendido o pago pendiente — pantalla de pago
  if (subStatus === 'suspended' || subStatus === 'pending_payment') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '48px 40px', maxWidth: 480,
          width: '100%', textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: subStatus === 'pending_payment' ? 'var(--primary-bg)' : '#fff1f1',
            border: `2px solid ${subStatus === 'pending_payment' ? 'rgba(13,110,253,0.3)' : '#fecaca'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            {subStatus === 'pending_payment'
              ? <CreditCard size={28} color="var(--primary)" />
              : <AlertTriangle size={28} color="#dc2626" />
            }
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
            {subStatus === 'pending_payment' ? 'Activá tu suscripción' : 'Período de prueba vencido'}
          </h2>

          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
            {subStatus === 'pending_payment'
              ? 'Tu cuenta está lista. Completá el pago para seguir usando el sistema.'
              : 'Tu período de prueba de 14 días venció. Suscribite para seguir usando el sistema.'
            }
          </p>

          {business?.plan && (
            <div style={{
              background: 'var(--primary-bg)', border: '1px solid rgba(13,110,253,0.2)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 24,
              fontSize: 13, color: 'var(--primary)', fontWeight: 600,
            }}>
              {PLAN_LABELS[business.plan] || business.plan}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paymentLink ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--primary)', color: '#fff',
                  padding: '14px 24px', borderRadius: 12,
                  fontWeight: 700, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 15, boxShadow: 'var(--shadow-blue)',
                }}>
                <CreditCard size={17} /> Pagar con MercadoPago
                <ExternalLink size={14} />
              </a>
            ) : (
              <button
                onClick={fetchPaymentLink}
                disabled={loadingLink}
                style={{
                  background: 'var(--primary)', color: '#fff',
                  padding: '14px 24px', borderRadius: 12,
                  fontWeight: 700, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 15, boxShadow: 'var(--shadow-blue)',
                  fontFamily: 'Inter, sans-serif', width: '100%',
                }}>
                <CreditCard size={17} />
                {loadingLink ? 'Generando link de pago...' : 'Activar suscripción'}
              </button>
            )}

            <button
              onClick={logout}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 12, padding: '11px 24px',
                color: 'var(--text2)', fontWeight: 500,
                cursor: 'pointer', fontSize: 14,
                fontFamily: 'Inter, sans-serif',
              }}>
              Cerrar sesión
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>
            {business?.name} · {profile?.email}
          </p>
        </div>
      </div>
    );
  }

  return children;
}