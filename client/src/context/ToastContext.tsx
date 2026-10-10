import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: Tone; message: string }
const Ctx = createContext<{ toast: (message: string, tone?: Tone) => void }>({ toast: () => undefined });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const icon = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-brand-600" />,
  };
  const ring = {
    success: 'ring-emerald-500/60',
    error: 'ring-red-500/60',
    info: 'ring-brand-500/60',
  };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={clsx('card animate-slide-in-right flex items-start gap-3 px-4 py-3 text-sm shadow-lift ring-2 ring-inset', ring[t.tone])}>
            <span className="mt-0.5">{icon[t.tone]}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}