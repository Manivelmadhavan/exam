import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Braces, CheckCircle2, ChevronDown, ChevronUp, Clock, Code2, ListChecks, Trophy, XCircle } from 'lucide-react';
import { Badge, Card } from './ui';
import { GradientRing } from './motion/ProgressRing';
import { AnimatedNumber } from './motion/AnimatedNumber';
import { Reveal } from './motion/Reveal';
import type { StudentResultFull, SubmissionStatus } from '../types';
import { formatDateTime, formatDuration, languageLabel, verdictLabel } from '../utils/format';

export const verdictTone = (s: SubmissionStatus | string) =>
  s === 'ACCEPTED' ? 'green' : s === 'NOT_ATTEMPTED' || s === 'DRAFT' ? 'gray' : s === 'WRONG_ANSWER' ? 'red' : 'amber';

const Chip = ({ icon, label, value, tint }: { icon: ReactNode; label: string; value: string; tint: string }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white/70 px-3 py-2 shadow-soft backdrop-blur">
    <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', tint)}>{icon}</span>
    <div className="leading-tight">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export function ResultSummary({ result }: { result: StudentResultFull }) {
  const [open, setOpen] = useState<string | null>(null);
  const showVerdict = result.exam.showVerdict;
  const pct = Math.round(result.percentage * 10) / 10;
  return (
    <div className="space-y-6">
      {result.attempt.autoSubmitted && (
        <Reveal animation="fade-in">
          <p role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> This exam was submitted automatically (time expired or rule limit reached).
          </p>
        </Reveal>
      )}

      <Reveal animation="fade-up">
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-soft sm:p-8">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-accent-500" />
          <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-400/10 blur-3xl" />
          <p aria-hidden className="absolute bottom-4 right-5 hidden font-mono text-7xl font-extrabold text-slate-100 sm:block">{'</>'}</p>
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <GradientRing value={pct} size={150} strokeWidth={12}>
              <span className="text-3xl font-extrabold text-slate-900"><AnimatedNumber value={pct} decimals={1} suffix="%" /></span>
              <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400">Percentage</span>
            </GradientRing>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600 sm:justify-start">
                <Trophy className="h-4 w-4" aria-hidden />Result for {result.student.name}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{result.exam.title}</h1>
              <p className="mt-1 text-sm text-slate-500">Scored <strong className="font-bold text-slate-700">{result.obtainedMarks} / {result.totalMarks} marks</strong> · {result.attemptedCount} of {result.totalQuestions} questions attempted</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                <Chip icon={<ListChecks className="h-4 w-4" aria-hidden />} label="Attempted" value={`${result.attemptedCount} / ${result.totalQuestions}`} tint="from-brand-500 to-blue-600" />
                <Chip icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} label="Accepted" value={String(result.acceptedCount)} tint="from-emerald-500 to-teal-600" />
                <Chip icon={<XCircle className="h-4 w-4" aria-hidden />} label="Wrong" value={String(result.wrongAnswerCount)} tint="from-amber-400 to-orange-500" />
                <Chip icon={<Code2 className="h-4 w-4" aria-hidden />} label="Unanswered" value={String(result.unansweredCount)} tint="from-slate-400 to-slate-600" />
                <Chip icon={<Clock className="h-4 w-4" aria-hidden />} label="Time taken" value={formatDuration(result.timeTakenSeconds)} tint="from-accent-500 to-purple-700" />
                <Chip icon={<Braces className="h-4 w-4" aria-hidden />} label="Submitted" value={formatDateTime(result.submittedAt)} tint="from-slate-600 to-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay="2">
        <Card title="Question-wise result" padded={false}>
          <ul className="divide-y divide-slate-100">
            {result.details.map((d, i) => {
              const isOpen = open === d.id;
              const t = verdictTone(d.status);
              return (
                <li key={d.id} className="transition-colors hover:bg-slate-50/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={clsx('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold',
                        t === 'green' ? 'bg-emerald-50 text-emerald-700' : t === 'red' ? 'bg-red-50 text-red-700' : t === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                        {i + 1}
                        {t === 'green' && <CheckCircle2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-emerald-500" aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{d.questionTitle}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge tone={t as 'green' | 'gray' | 'red' | 'amber'}>
                            {showVerdict || d.status === 'NOT_ATTEMPTED' ? verdictLabel(d.status) : 'Submitted'}
                          </Badge>
                          <span className="tabular-nums">Marks <strong className="text-slate-700">{d.marks} / {d.maxMarks}</strong></span>
                          {d.status !== 'NOT_ATTEMPTED' && <span className="tabular-nums">Tests {d.passedTestCases}/{d.totalTestCases} passed</span>}
                          {d.language && <span>{languageLabel(d.language)}</span>}
                        </p>
                      </div>
                    </div>
                    {d.sourceCode && (
                      <button type="button" aria-expanded={isOpen}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        onClick={() => setOpen(isOpen ? null : d.id)}>
                        {isOpen ? 'Hide code' : 'View my code'}{isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                      </button>
                    )}
                  </div>
                  {isOpen && d.sourceCode && (
                    <div className="animate-fade-in px-4 pb-4" key="code">
                      <div className="flex items-center justify-between rounded-t-lg border border-slate-800 bg-slate-800 px-3 py-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300"><Braces className="h-3.5 w-3.5 text-brand-400" aria-hidden />Solution</span>
                        <span className="font-mono text-[11px] text-slate-400">{languageLabel(d.language ?? 'PYTHON')}</span>
                      </div>
                      <pre tabIndex={0} aria-label={`Source code for question ${d.questionNumber}`}
                        className="max-h-96 overflow-auto whitespace-pre-wrap rounded-b-lg border border-t-0 border-slate-800 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed text-slate-100 dark-scroll">{d.sourceCode}</pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </Reveal>
    </div>
  );
}
export default ResultSummary;