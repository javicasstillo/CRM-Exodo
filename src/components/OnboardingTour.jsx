import { useState, useEffect } from 'react';
import { saveBusinessConfig } from '../firebase';
import { useApp } from '../context/AppContext';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    page: 'settings',
    target: null,
    position: 'center',
    title: '¡Bienvenido a Genesys App! 👋',
    message: 'En pocos pasos te guiamos por todo el sistema. Solo tarda 2 minutos. Podés saltar el tour cuando quieras.',
  },
  {
    id: 'config-logo',
    page: 'settings',
    target: 'onboarding-logo',
    position: 'right',
    title: 'Logo de tu negocio',
    message: 'Subí el logo de tu tienda. Aparece en el sidebar y en los recibos PDF que le entregás a tus clientes.',
  },
  {
    id: 'config-name',
    page: 'settings',
    target: 'onboarding-name',
    position: 'right',
    title: 'Nombre del negocio',
    message: 'Poné el nombre de tu tienda tal como se llama. Este nombre aparece en el sistema y en todos los recibos.',
  },
  {
    id: 'config-whatsapp',
    page: 'settings',
    target: 'onboarding-whatsapp',
    position: 'right',
    title: 'WhatsApp — muy importante',
    message: 'Este número recibe las consultas de tu catálogo online. Poné el número con código de área, sin el 0 ni el 15. Ejemplo: 2614093585',
  },
  {
    id: 'config-save',
    page: 'settings',
    target: 'onboarding-save',
    position: 'center',
    title: 'Guardá la configuración',
    message: 'Cuando termines de completar los datos, tocá "Guardar cambios". Después seguimos con el resto del sistema.',
  },
  {
    id: 'nav-stock',
    page: 'phones',
    target: 'onboarding-add-product',
    position: 'center',
    title: 'Stock — tu inventario',
    message: 'Acá cargás todos tus productos: iPhones, Samsung, accesorios, fundas y más. Cada producto tiene foto, precio, IMEI y condición. Tocá "Agregar producto" para empezar.',
  },
  {
    id: 'nav-buyers',
    page: 'buyers',
    target: 'onboarding-add-buyer',
    position: 'center',
    title: 'Compradores — tus clientes',
    message: 'Guardá los datos de cada cliente: nombre, DNI y teléfono. El sistema lleva el historial de compras de cada uno automáticamente.',
  },
  {
    id: 'nav-sales',
    page: 'sales',
    target: 'onboarding-add-sale',
    position: 'center',
    title: 'Ventas — cada operación',
    message: 'Cuando vendés algo, tocá "Registrar venta". El producto pasa a vendido, la ganancia queda registrada y podés generar el recibo PDF al instante.',
  },
  {
    id: 'nav-stats',
    page: 'stats',
    target: null,
    position: 'center',
    title: 'Estadísticas — tu negocio en números',
    message: 'Acá ves cuánto ganás realmente, de dónde vienen tus clientes y cuáles son los productos que más vendés. Todo se actualiza solo con cada venta.',
  },
  {
    id: 'done',
    page: 'dashboard',
    target: null,
    position: 'center',
    title: '¡Listo! Ya sabés usar Genesys App 🎉',
    message: 'Tu negocio está configurado y listo para operar. Empezá cargando tu stock y registrando tus primeras ventas. ¡Éxitos!',
  },
];

export default function OnboardingTour({ onComplete, onNavigate }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const { profile, refreshBusiness } = useApp();

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  // Navegar a la página correcta cuando cambia el paso
  useEffect(() => {
    if (step.page && onNavigate) onNavigate(step.page);
  }, [stepIndex]);

  // Encontrar el elemento target en el DOM
  useEffect(() => {
    if (!step.target) { setTargetRect(null); return; }
    const timer = setTimeout(() => {
      const el = document.getElementById(step.target);
      if (!el) { setTargetRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }, 350);
    }, 450);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  const handleNext = () => {
    if (isLast) { handleComplete(); return; }
    setStepIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex(i => i - 1);
  };

  const handleComplete = async () => {
    try {
      await saveBusinessConfig(profile.businessId, { onboardingCompleted: true });
      await refreshBusiness();
    } catch (e) {
      console.error('Error completando onboarding:', e);
    }
    onComplete();
  };

  // Calcular posición de la burbuja
  const W = 380;
  const getBubbleStyle = () => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: W, zIndex: 1002,
      };
    }
    const gap = 16;
    const vp = { w: window.innerWidth, h: window.innerHeight };
    if (step.position === 'right') {
      const left = targetRect.right + gap;
      const top = Math.max(16, Math.min(targetRect.top, vp.h - 320));
      if (left + W > vp.w - 16) {
        return { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', width: W, zIndex: 1002 };
      }
      return { position: 'fixed', top, left, width: W, zIndex: 1002 };
    }
    if (step.position === 'top') {
      const top = Math.max(16, targetRect.top - 240);
      const left = Math.max(16, Math.min(targetRect.left, vp.w - W - 16));
      return { position: 'fixed', top, left, width: W, zIndex: 1002 };
    }
    if (step.position === 'bottom') {
      const top = Math.min(targetRect.bottom + gap, vp.h - 280);
      const left = Math.max(16, Math.min(targetRect.left, vp.w - W - 16));
      return { position: 'fixed', top, left, width: W, zIndex: 1002 };
    }
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W, zIndex: 1002 };
  };

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(11,21,48,0.6)',
        zIndex: 999,
        backdropFilter: 'blur(2px)',
      }} />

      {/* Highlight */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: 12,
          border: '2px solid #3d8bfd',
          boxShadow: '0 0 0 4px rgba(61,139,253,0.25)',
          zIndex: 1001,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }} />
      )}

      {/* Burbuja */}
      <div style={{
        ...getBubbleStyle(),
        background: '#ffffff',
        borderRadius: 20,
        padding: '24px 24px 20px',
        boxShadow: '0 24px 64px rgba(11,21,48,0.28)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eff4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={15} color="#0d6efd" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1729', margin: 0, lineHeight: 1.3 }}>
              {step.title}
            </h3>
          </div>
          <button onClick={handleComplete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Mensaje */}
        <p style={{ fontSize: 13, color: '#4a5675', lineHeight: 1.65, margin: 0 }}>
          {step.message}
        </p>

        {/* Indicadores */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === stepIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === stepIndex ? '#0d6efd' : i < stepIndex ? '#93c5fd' : '#e2e8f0',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              {stepIndex + 1} / {STEPS.length}
            </span>
            <button onClick={handleComplete}
              style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
              Saltar
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={handlePrev}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 10 }}>
                <ArrowLeft size={12} /> Anterior
              </button>
            )}
            <button onClick={handleNext}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: '#0d6efd', border: 'none', cursor: 'pointer', padding: '8px 18px', borderRadius: 10, boxShadow: '0 2px 8px rgba(13,110,253,0.3)' }}>
              {isLast ? '¡Empezar!' : 'Siguiente'} {!isLast && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}