import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: <CheckCircle2 size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />
};

const STYLES = {
  success: { background: 'var(--color-success)', color: '#fff' },
  error: { background: 'var(--color-error)', color: '#fff' },
  warning: { background: 'var(--color-warning)', color: '#fff' },
  info: { background: 'var(--primary)', color: '#fff' }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((msg, type, dur) => addToast(msg, type, dur), [addToast]);
  toast.success = (msg, dur) => addToast(msg, 'success', dur);
  toast.error = (msg, dur) => addToast(msg, 'error', dur || 5000);
  toast.warning = (msg, dur) => addToast(msg, 'warning', dur || 4500);
  toast.info = (msg, dur) => addToast(msg, 'info', dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        pointerEvents: 'none', maxWidth: '400px', width: 'calc(100% - 40px)'
      }}>
        {toasts.map(t => {
          const style = STYLES[t.type] || STYLES.info;
          return (
            <div key={t.id} onClick={() => removeToast(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px', borderRadius: 'var(--radius-sm)',
              background: style.background, color: style.color,
              boxShadow: 'var(--shadow-lg)', fontSize: '0.9rem', fontWeight: 600,
              pointerEvents: 'auto', animation: 'toastSlideIn 0.3s ease-out forwards',
              cursor: 'pointer', lineHeight: 1.4
            }}>
              <span style={{ flexShrink: 0 }}>{ICONS[t.type]}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <X size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
