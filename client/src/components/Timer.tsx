import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Clock } from 'lucide-react';
import { formatClock } from '../utils/format';
import { timerTone } from '../features/exam/timer';

/** Attractive countdown. Colour changes (amber < 5 min, red < 1 min) are reinforced by an icon-free text label and polite live announcements. */
export function Timer({ seconds }: { seconds: number }) {
  const tone = timerTone(seconds);
  const said = useRef({ five: false, one: false });
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (seconds <= 0) return;
    if (seconds <= 60 && !said.current.one) { said.current.one = true; said.current.five = true; setAnnouncement('Warning: 1 minute remaining.'); }
    else if (seconds <= 300 && !said.current.five) { said.current.five = true; setAnnouncement('Warning: 5 minutes remaining.'); }
  }, [seconds]);
  const ring = tone === 'normal' ? 'from-slate-200 via-slate-100 to-brand-100'
    : tone === 'warning' ? 'from-amber-200 via-amber-100 to-orange-100'
    : 'from-red-200 via-red-100 to-rose-200';
  const inner = tone === 'normal' ? 'bg-white text-slate-900'
    : tone === 'warning' ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-700';
  const label = tone === 'normal' ? 'text-slate-400' : tone === 'warning' ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-2">
      <div role="timer" aria-live="off" aria-label={`Time remaining ${formatClock(seconds)}`
      } className={clsx('group relative rounded-2xl p-[1.5px] shadow-soft', tone === 'danger' && 'animate-pulse-soft')}>
        <span aria-hidden className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${ring}`} />
        <div className={clsx('relative flex items-center gap-2 rounded-2xl px-3.5 py-1.5 transition-colors duration-300', inner)}>
          <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full bg-current/10', label)}>
            <Clock className={clsx('h-4 w-4', tone === 'danger' && 'animate-tick')} aria-hidden />
          </span>
          <div className="leading-none">
            <span className="block font-mono text-xl font-bold tabular-nums sm:text-2xl">{formatClock(seconds)}</span>
            <span className={clsx('block text-[0.6rem] font-semibold uppercase tracking-widest', label)}>
              {tone === 'danger' ? 'Under 1 min' : tone === 'warning' ? 'Under 5 min' : 'Time left'}
            </span>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="assertive">{announcement}</p>
    </div>
  );
}
export default Timer;