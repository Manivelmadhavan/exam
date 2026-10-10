import { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Inbox, Loader2, Code2, ServerCrash } from 'lucide-react';
import { Button } from './Button';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { Reveal } from '../motion/Reveal';

export const LoadingSpinner = ({ label = 'Loading...', className }: { label?: string; className?: string }) => (
  <div role="status" className={clsx('flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-500', className)}>
    <div className="relative">
      <span className="absolute inset-0 animate-pulse-ring rounded-full" aria-hidden />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow">
        <Code2 className="h-6 w-6" aria-hidden />
      </div>
    </div>
    <span className="flex items-center gap-2 font-medium text-slate-600"><Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />{label}</span>
  </div>
);

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <Reveal animation="scale-in" className="flex flex-col items-center gap-3 px-4 py-14 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 text-brand-500 ring-1 ring-brand-100">
      <Inbox className="h-7 w-7" aria-hidden />
    </div>
    <p className="font-semibold text-slate-800">{title}</p>
    {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
    {action}
  </Reveal>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 px-4 py-14 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
      <ServerCrash className="h-7 w-7" aria-hidden />
    </div>
    <p className="max-w-md text-sm font-medium text-slate-700">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}><AlertTriangle className="h-4 w-4" aria-hidden />Try again</Button>}
  </div>
);

type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple';
const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  blue: 'bg-brand-50 text-brand-700 ring-brand-200/60',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  red: 'bg-red-50 text-red-700 ring-red-200/60',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200/60',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200/60',
};
export const Badge = ({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) => (
  <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>{children}</span>
);

export const Card = ({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) => (
  <Reveal animation="fade-in" as="section" className={clsx('card overflow-hidden', className)}>
    {(title || actions) && (
      <header className="relative flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent px-5 py-3.5">
        {title && <h2 className="flex items-center gap-2">{title}</h2>}{actions}
      </header>
    )}
    <div className={padded ? 'p-5' : ''}>{children}</div>
  </Reveal>
);

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <Reveal className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1>{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </Reveal>
);

type StatTone = 'blue' | 'green' | 'amber' | 'purple' | 'accent';
const statBg: Record<StatTone, string> = {
  blue: 'from-brand-500 to-brand-700 text-white',
  green: 'from-emerald-500 to-emerald-700 text-white',
  amber: 'from-amber-400 to-orange-500 text-white',
  purple: 'from-violet-500 to-purple-700 text-white',
  accent: 'from-blue-500 to-violet-600 text-white',
};
const statGlow: Record<StatTone, string> = {
  blue: 'shadow-brand-500/30', green: 'shadow-emerald-500/30', amber: 'shadow-amber-500/30', purple: 'shadow-violet-500/30', accent: 'shadow-violet-500/30',
};

export const StatCard = ({ label, value, icon, tone = 'blue' }: { label: string; value: ReactNode; icon?: ReactNode; tone?: StatTone }) => (
  <Reveal delay="1" className="card card-hover flex items-center gap-4 p-5">
    {icon && (
      <div className={clsx('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg', statBg[tone], statGlow[tone])}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent opacity-60" aria-hidden />
        {icon}
      </div>
    )}
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
    </div>
  </Reveal>
);