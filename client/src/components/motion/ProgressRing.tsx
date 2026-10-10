import { ReactNode, useEffect, useId, useState } from 'react';
import clsx from 'clsx';

interface Props {
  /** 0..100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Rendered in the centre of the ring */
  children?: ReactNode;
  label?: string;
  tone?: 'blue' | 'green' | 'purple' | 'amber' | 'red';
}

const STROKE: Record<NonNullable<Props['tone']>, string> = {
  blue: '#2563eb',
  green: '#10b981',
  purple: '#7c3aed',
  amber: '#f59e0b',
  red: '#ef4444',
};

/** Animated SVG progress ring with a blue->purple gradient option. */
export function ProgressRing({ value, size = 120, strokeWidth = 10, className, children, label, tone = 'blue' }: Props) {
  const gradId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (drawn / 100) * c;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} role="img" aria-label={label ?? `${value} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-gradient-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out [transition-timing-function:cubic-bezier(.22,.61,.36,1)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Blue -> purple gradient variant (uses a shared gradient def). */
export function GradientRing({ value, size = 120, strokeWidth = 10, className, children, label }: Omit<Props, 'tone'>) {
  const gradId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (drawn / 100) * c;
  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} role="img" aria-label={label ?? `${value} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-gradient-full-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-gradient-full-${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out [transition-timing-function:cubic-bezier(.22,.61,.36,1)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}