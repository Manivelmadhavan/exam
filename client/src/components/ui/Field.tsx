import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface Common { label?: string; error?: string; hint?: string }
const Wrapper = ({ id, label, error, hint, children }: Common & { id: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>}
    {children}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p id={`${id}-err`} role="alert" className="animate-fade-in text-xs font-medium text-red-600">{error}</p>}
  </div>
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(({ label, error, hint, className, id, ...rest }, ref) => {
  const auto = useId(); const fid = id ?? auto;
  return <Wrapper id={fid} label={label} error={error} hint={hint}>
    <input ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} className={clsx('input', error && 'aria-invalid', className)} {...rest} />
  </Wrapper>;
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(({ label, error, hint, className, id, ...rest }, ref) => {
  const auto = useId(); const fid = id ?? auto;
  return <Wrapper id={fid} label={label} error={error} hint={hint}>
    <textarea ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} className={clsx('input min-h-[88px] font-mono', error && 'aria-invalid', className)} {...rest} />
  </Wrapper>;
});
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(({ label, error, hint, className, id, children, ...rest }, ref) => {
  const auto = useId(); const fid = id ?? auto;
  return <Wrapper id={fid} label={label} error={error} hint={hint}>
    <select ref={ref} id={fid} aria-invalid={!!error} className={clsx('input', error && 'aria-invalid', className)} {...rest}>{children}</select>
  </Wrapper>;
});
Select.displayName = 'Select';

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }>(({ label, hint, className, id, ...rest }, ref) => {
  const auto = useId(); const fid = id ?? auto;
  return (
    <label htmlFor={fid} className={clsx('flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 transition-colors hover:text-slate-900', className)}>
      <span className="relative mt-0.5 inline-flex">
        <input ref={ref} id={fid} type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-400" {...rest} />
      </span>
      <span className="font-medium">{label}{hint && <span className="block text-xs font-normal text-slate-500">{hint}</span>}</span>
    </label>
  );
});
Checkbox.displayName = 'Checkbox';