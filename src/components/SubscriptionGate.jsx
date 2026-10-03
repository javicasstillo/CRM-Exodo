import { useApp } from '../context/AppContext';
import { logout } from '../firebase';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';

export default function SubscriptionGate({ children }) {
  const { subStatus, trialDays, business, profile } = useApp();

  // Trial activo — mostrar banner pero dejar pasar
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
            <a
              href="https://api.whatsapp.com/send?phone=2604104160&text=Hola! Quiero activar mi suscripción de Genesys App"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#0d6efd', color: '#fff',
                padding: '6px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <CreditCard size={13} /> Activar suscripción
            </a>
          </div>
        )}
        {children}
      </>
    );
  }

  // Activo — acceso total
  if (subStatus === 'active') return children;

  // Suspendido o pago pendiente — bloquear acceso
  if (subStatus === 'suspended' || subStatus === 'pending_payment') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '48px 40px', maxWidth: 440,
          width: '100%', textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#fff1f1', border: '2px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <AlertTriangle size={28} color="#dc2626" />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
            {subStatus === 'pending_payment' ? 'Pago pendiente' : 'Suscripción suspendida'}
          </h2>

          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
            {subStatus === 'pending_payment'
              ? 'Tu cuenta está creada pero el pago no se completó. Activá tu suscripción para acceder al sistema.'
              : 'Tu período de prueba venció o tu suscripción fue suspendida. Contactanos para reactivar tu cuenta.'
            }
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://api.whatsapp.com/send?phone=2604104160&text=Hola! Quiero activar/reactivar mi suscripción de Genesys App"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'var(--primary)', color: '#fff',
                padding: '13px 24px', borderRadius: 12,
                fontWeight: 600, textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14,
              }}>
              <CreditCard size={16} /> Activar suscripción
            </a>

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
            {business?.name || 'Tu negocio'} · {profile?.email}
          </p>
        </div>
      </div>
    );
  }

  // Estado desconocido — dejar pasar (fallback seguro)
  return children;
}