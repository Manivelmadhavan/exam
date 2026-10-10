import { ComponentProps, ReactNode } from 'react';
import { Button as BaseButton } from './ui';

/** Button that accepts an optional leading icon. */
export function Button({ icon, children, ...rest }: ComponentProps<typeof BaseButton> & { icon?: ReactNode }) {
  return <BaseButton {...rest}>{icon}{children}</BaseButton>;
}

const tones = {
  red: 'border-red-200 bg-red-50 text-red-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-brand-200 bg-brand-50 text-brand-800',
};
export function Alert({ tone = 'red', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <div role="alert" className={`animate-fade-in rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>;
}