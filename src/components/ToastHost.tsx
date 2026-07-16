import { useToastStore } from "../store/toastStore";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} role="status">
          <span className="toast-message">{t.message}</span>
          <div className="toast-actions">
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast-dismiss"
              aria-label="關閉通知"
              onClick={() => dismissToast(t.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
