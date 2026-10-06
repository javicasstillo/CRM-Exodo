import { useState, useEffect } from 'react';
import { saveBusinessConfig } from '../firebase';
import { useApp } from '../context/AppContext';
import { X, ArrowRight, Sparkles } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Genesys App! 👋',
    message: 'En 3 pasos rápidos configuramos tu negocio y quedás listo para empezar. Solo te lleva 2 minutos.',
    target: null, // modal centrado, sin apuntar a nada
    position: 'center',
  },
  {
    id: 'logo',
    title: 'Subí el logo de tu negocio',
    message: 'Aparece en el sidebar y en los recibos PDF que le das a tus clientes.',
    target: 'onboarding-logo',
    position: 'right',
  },
  {
    id: 'name',
    title: 'Nombre del negocio',
    message: 'Usalo como se llama tu tienda. Este nombre aparece en el sistema y en los recibos.',
    target: 'onboarding-name',
    position: 'right',
  },
  {
    id: 'whatsapp',
    title: 'Número de WhatsApp',
    message: 'Muy importante: este número recibe las consultas de tu catálogo online. Poné el número con código de área, sin el 0 ni el 15.',
    target: 'onboarding-whatsapp',
    position: 'right',
  },
  {
    id: 'save',
    title: '¡Guardá y arrancás!',
    message: 'Tocá "Guardar cambios" y tu negocio queda configurado. Después podés cargar tu stock y compartir tu catálogo.',
    target: 'onboarding-save',
    position: 'top',
  },
];

function Overlay({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(11,21,48,0.55)',
        zIndex: 999,
        backdropFilter: 'blur(2px)',
      }}
    />
  );
}

function Bubble({ step, onNext, onSkip, isLast, currentIndex, total }) {
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!step.target) { setTargetRect(null); return; }
    const el = document.getElementById(step.target);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step]);

  const bubbleStyle = (() => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
      };
    }
    if (step.position === 'right') {
      return {
        position: 'fixed',
        top: Math.min(targetRect.top, window.innerHeight - 240),
        left: targetRect.right + 20,
        width: 340,
      };
    }
    if (step.position === 'top') {
      return {
        position: 'fixed',
        top: targetRect.top - 180,
        left: targetRect.left,
        width: 340,
      };
    }
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 380 };
  })();

  return (
    <>
      {/* Highlight del elemento target */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: 12,
          border: '2px solid #3d8bfd',
          boxShadow: '0 0 0 4px rgba(61,139,253,0.2)',
          zIndex: 1001,
          pointerEvents: 'none',
        }} />
      )}

      {/* Burbuja */}
      <div style={{
        ...bubbleStyle,
        background: '#ffffff',
        borderRadius: 20,
        padding: '28px 28px 24px',
        boxShadow: '0 20px 60px rgba(11,21,48,0.25)',
        zIndex: 1002,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={16} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f1729', margin: 0, lineHeight: 1.3 }}>{step.title}</h3>
          </div>
          <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Mensaje */}
        <p style={{ fontSize: 13, color: '#4a5675', lineHeight: 1.6, margin: 0 }}>{step.message}</p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{currentIndex + 1} / {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSkip} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>
              Saltar
            </button>
            <button onClick={onNext} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--primary)', border: 'none', cursor: 'pointer', padding: '8px 18px', borderRadius: 10 }}>
              {isLast ? '¡Listo!' : 'Siguiente'} <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === currentIndex ? 20 : 6, height: 6, borderRadius: 3, background: i === currentIndex ? 'var(--primary)' : '#e2e8f0', transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const { profile, business, refreshBusiness } = useApp();

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
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

  const currentStep = STEPS[step];

  return (
    <>
      <Overlay onClick={() => {}} />
      <Bubble
        step={currentStep}
        onNext={handleNext}
        onSkip={handleComplete}
        isLast={step === STEPS.length - 1}
        currentIndex={step}
        total={STEPS.length}
      />
    </>
  );
}
