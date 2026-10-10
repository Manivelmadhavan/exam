import clsx from 'clsx';
import { CheckCircle2, Circle, CircleDot, Loader2 } from 'lucide-react';

export type NavState = 'NOT_ATTEMPTED' | 'ATTEMPTED' | 'RUNNING' | 'SUBMITTED';
export const NAV_LABEL: Record<NavState, string> = { NOT_ATTEMPTED: 'Not Attempted', ATTEMPTED: 'Attempted', RUNNING: 'Running', SUBMITTED: 'Submitted' };
const ICON: Record<NavState, JSX.Element> = {
  NOT_ATTEMPTED: <Circle className="h-3.5 w-3.5" aria-hidden />,
  ATTEMPTED: <CircleDot className="h-3.5 w-3.5" aria-hidden />,
  RUNNING: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />,
  SUBMITTED: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
};
const DOT: Record<NavState, string> = {
  NOT_ATTEMPTED: 'bg-slate-300',
  ATTEMPTED: 'bg-amber-400',
  RUNNING: 'bg-brand-500',
  SUBMITTED: 'bg-emerald-500',
};
const STYLE: Record<NavState, string> = {
  NOT_ATTEMPTED: 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
  ATTEMPTED: 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400',
  RUNNING: 'border-brand-300 bg-brand-50 text-brand-800 hover:border-brand-400',
  SUBMITTED: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
};

export function QuestionNavigator({ states, current, onSelect, disabled }: { states: NavState[]; current: number; onSelect: (i: number) => void; disabled?: boolean }) {
  const counts = states.reduce<Record<NavState, number>>((acc, s) => { acc[s] = (acc[s] ?? 0) + 1; return acc; }, {} as Record<NavState, number>);
  return (
    <nav aria-label="Question navigation" className="space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft">
        <h2 className="flex items-center justify-between text-sm font-bold text-slate-700">
          <span>Questions</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{current + 1}/{states.length}</span>
        </h2>
        <ol className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-3 xl:grid-cols-2">
          {states.map((s, i) => (
            <li key={i}>
              <button type="button" disabled={disabled} onClick={() => onSelect(i)} aria-current={i === current ? 'step' : undefined}
                aria-label={`Question ${i + 1}: ${NAV_LABEL[s]}`} title={NAV_LABEL[s]}
                className={clsx('flex w-full flex-col items-center gap-1 rounded-lg border-2 py-1.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60', STYLE[s],
                  i === current && 'scale-100 border-transparent bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow')}>
                <span>{i + 1}</span>{ICON[s]}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <ul className="hidden space-y-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-xs text-slate-600 shadow-soft lg:block" aria-label="Legend">
        {(Object.keys(NAV_LABEL) as NavState[]).map((k) => (
          <li key={k} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">{NAV_LABEL[k]}</span>
            <span className="flex items-center gap-1.5">
              <span className={clsx('h-2 w-2 rounded-full', DOT[k])} aria-hidden />
              <span className="tabular-nums font-bold">{counts[k] ?? 0}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
export default QuestionNavigator;