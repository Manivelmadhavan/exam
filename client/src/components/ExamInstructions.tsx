import { ShieldAlert } from 'lucide-react';
import { Markdown } from './Markdown';
import type { ExamSettings } from '../types';

export function importantRules(s: ExamSettings): string[] {
  const rules = [
    'Do not refresh or close the page during the exam. If you do, you can continue from the same attempt with the correct remaining time.',
    'Your code must produce exactly the expected output for the hidden test cases.',
    'Your exam is submitted automatically when the time expires.',
    'The timer is controlled by the server; changing your computer clock has no effect.',
    'Your code is saved automatically. If your internet drops, it is kept on this device and synced when you are back online.',
  ];
  if (s.fullscreenRequired) rules.push('Fullscreen is required. Do not leave fullscreen mode.');
  if (s.disableCopyPaste) rules.push('Copy, cut and paste are disabled.');
  if (s.disableRightClick) rules.push('Right-click is disabled.');
  if (s.tabSwitchDetection) rules.push('Switching tabs or windows is detected and recorded.');
  if (s.maxViolations > 0) rules.push(`After ${s.maxViolations} violations your exam will be submitted automatically.`);
  return rules;
}

export function ExamInstructions({ instructions, settings }: { instructions: string; settings: ExamSettings }) {
  return (
    <div className="space-y-5">
      {instructions.trim() && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">Instructions</h3>
          <div className="rounded-r-lg border-l-2 border-brand-200 bg-slate-50/60 pl-4"><Markdown>{instructions}</Markdown></div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4">
        <span aria-hidden className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />
        <h3 className="relative mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600"><ShieldAlert className="h-4 w-4" aria-hidden /></span>
          Important rules
        </h3>
        <ul className="relative grid gap-2 pl-1 text-sm text-amber-900 sm:grid-cols-2">
          {importantRules(settings).map((r, i) => (
            <li key={r} className="flex items-start gap-2">
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/30 text-[9px] font-extrabold text-amber-700">{i + 1}</span>
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}