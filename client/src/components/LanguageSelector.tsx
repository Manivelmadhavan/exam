import { useId } from 'react';
import clsx from 'clsx';
import type { Language } from '../types';
import { languageLabel } from '../utils/format';

const DOTS: Record<Language, string> = {
  JAVA: 'bg-orange-400',
  CPP: 'bg-sky-400',
  PYTHON: 'bg-emerald-400',
};

/** Segmented Java / C++ / Python language selector for the code editor toolbar. */
export function LanguageSelector({ languages, value, onChange, disabled }: { languages: Language[]; value: Language; onChange: (l: Language) => void; disabled?: boolean }) {
  const id = useId();
  const single = languages.length <= 1;
  const available = languages.length ? languages : [value];
  return (
    <div className="flex items-center gap-2">
      <label id={`${id}-label`} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Language</label>
      {single ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/50 bg-gradient-to-r from-brand-600 to-accent-600 px-2.5 py-1 text-xs font-bold text-white shadow-glow"
          title="Only one language is enabled for this exam">
          <span className={clsx('h-1.5 w-1.5 rounded-full bg-white/90')} aria-hidden />
          {languageLabel(value)}
        </span>
      ) : (
        <div role="group" aria-labelledby={`${id}-label`} className="flex items-center gap-0.5 rounded-lg border border-slate-600/80 bg-slate-800/70 p-0.5">
          {available.map((l, i) => {
            const active = l === value;
            return (
              <button key={l} type="button" disabled={disabled} aria-pressed={active}
                onClick={() => onChange(l)}
                className={clsx('relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60',
                  i === 0 && 'rounded-l-md', i === available.length - 1 && 'rounded-r-md',
                  active ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white')}>
                <span className={clsx('h-1.5 w-1.5 rounded-full', active ? 'bg-white/90' : DOTS[l], active && 'animate-pulse-soft')} aria-hidden />
                {languageLabel(l)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default LanguageSelector;