import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
};

const COLORS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
  error:   { bg: '#fff1f1', border: '#fecaca', color: '#dc2626' },
  info:    { bg: 'var(--primary-bg)', border: 'rgba(13,110,253,0.2)', color: 'var(--primary)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.success;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              padding: '12px 16px', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              fontSize: 13, fontWeight: 600,
              pointerEvents: 'all', cursor: 'pointer',
              animation: 'slideInRight 0.3s ease',
              minWidth: 260, maxWidth: 360,
            }} onClick={() => remove(t.id)}>
              {ICONS[t.type]}
              <span style={{ flex: 1 }}>{t.message}</span>
              <X size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}