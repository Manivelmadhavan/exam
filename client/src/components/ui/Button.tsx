import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, Props>(({ variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }, ref) => (
  <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading}
    className={clsx(
      'group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:ring-4 disabled:cursor-not-allowed',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
      variant === 'primary' && 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow hover:shadow-lift hover:brightness-110 active:scale-[.98] disabled:opacity-60',
      variant === 'secondary' && 'border border-slate-200 bg-white text-slate-700 shadow-soft hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700 active:scale-[.98] disabled:text-slate-400',
      variant === 'danger' && 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-soft hover:brightness-110 active:scale-[.98] disabled:opacity-60',
      variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
      className,
    )} {...rest}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = 'Button';