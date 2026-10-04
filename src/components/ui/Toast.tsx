import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface ToastItem { id: number; kind: ToastKind; text: string }
const ToastContext = createContext<{ toast: (kind: ToastKind, text: string) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-glass-lg dark:border-neutral-800 dark:bg-neutral-900">
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-500" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
