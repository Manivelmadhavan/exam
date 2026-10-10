import clsx from 'clsx';
import { ReactNode } from 'react';
import { CheckCircle2, Clock, Loader2, Terminal, XCircle } from 'lucide-react';
import type { RunCustomResult, RunSamplesResult } from '../types';
import { verdictLabel } from '../utils/format';

export type ConsoleState =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'custom'; result: RunCustomResult }
  | { kind: 'samples'; results: RunSamplesResult['results'] }
  | { kind: 'submitted'; message: string; tone: 'success' | 'info' | 'error'; details?: string[] }
  | { kind: 'error'; message: string };

const Pre = ({ label, text, tone }: { label: string; text: string; tone?: 'err' }) => (
  <div>
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <pre className={clsx('max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-black/45 p-2.5 font-mono text-xs leading-relaxed', tone === 'err' ? 'border-red-900/50 text-red-300' : 'text-slate-100')}>{text || '(empty)'}</pre>
  </div>
);
const statusName = (s: string) => (s === 'SUCCESS' ? 'Success' : verdictLabel(s));
const Pill = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span className={clsx('mr-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
    ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300')}>{children}</span>
);

export function OutputConsole({ state }: { state: ConsoleState }) {
  return (
    <section aria-label="Output console" aria-live="polite" aria-busy={state.kind === 'running'}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-lift">
      <header className="flex items-center gap-2 border-b border-slate-700/70 bg-slate-800/60 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        <Terminal className="h-3.5 w-3.5 text-brand-400" aria-hidden />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Output</span>
        <span className="ml-auto font-mono text-[10px] text-slate-600">$ ./run</span>
      </header>
      <div className="min-h-[3.5rem] flex-1 space-y-3 overflow-auto p-3 text-sm">
        {state.kind === 'idle' && <p className="flex h-full items-center gap-2 py-2 text-slate-500"><span aria-hidden className="font-mono text-slate-700">λ</span> Run your code to see the output here.</p>}
        {state.kind === 'running' && (
          <p className="flex items-center gap-2 text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden />{state.label}
            <span className="flex gap-0.5" aria-hidden><span className="typing-dot h-1 w-1 rounded-full" /><span className="typing-dot h-1 w-1 rounded-full [animation-delay:0.12s]" /><span className="typing-dot h-1 w-1 rounded-full [animation-delay:0.24s]" /></span>
          </p>
        )}
        {state.kind === 'error' && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-300"><XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{state.message}</p>}
        {state.kind === 'submitted' && (
          <div>
            <p className={clsx('flex items-center gap-2 rounded-lg border p-2 font-medium',
              state.tone === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : state.tone === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-sky-500/40 bg-sky-500/10 text-sky-300')}>
              {state.tone === 'error' ? <XCircle className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}{state.message}
            </p>
            {state.details?.map((d) => <p key={d} className="mt-1.5 text-slate-300">{d}</p>)}
          </div>
        )}
        {state.kind === 'custom' && (
          <>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className={clsx('font-semibold', state.result.status === 'SUCCESS' ? 'text-emerald-300' : 'text-red-300')}>
                Status: {statusName(state.result.status)}
              </span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{state.result.executionTimeMs} ms</span>
            </p>
            {state.result.compilerMessage && <Pre label="Compiler message" text={state.result.compilerMessage} tone="err" />}
            <Pre label="Output (stdout)" text={state.result.output} />
            {state.result.errorMessage && <Pre label="Error (stderr)" text={state.result.errorMessage} tone="err" />}
          </>
        )}
        {state.kind === 'samples' && (
          <div className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                <span className="font-bold tabular-nums">{state.results.filter((r) => r.passed).length}</span> of <span className="font-bold tabular-nums">{state.results.length}</span> samples passed</span>
            </p>
            {!state.results.some((r) => !r.passed) && <p className="text-xs text-slate-400">All sample tests passed — you're ready to check your solution against the hidden tests.</p>}
            <ul className="space-y-3">
              {state.results.map((r, i) => (
                <li key={i} className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-2.5">
                  <p className={clsx('mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold', r.passed ? 'text-emerald-300' : 'text-red-300')}>
                    {r.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                    Sample {i + 1}
                    {r.passed ? <Pill ok><CheckCircle2 className="h-3 w-3" aria-hidden />Passed</Pill> : <Pill ok={false}><XCircle className="h-3 w-3" aria-hidden />Failed</Pill>}
                    <span className="text-xs font-normal text-slate-400">{statusName(r.status)} · <Clock className="inline h-3 w-3" aria-hidden /> {r.executionTimeMs} ms</span>
                  </p>
                  {!r.passed && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Pre label="Input" text={r.input} />
                      <Pre label="Expected" text={r.expectedOutput} />
                      <Pre label="Actual" text={r.output} />
                      {(r.compilerMessage || r.errorMessage) && <Pre label="Messages" text={[r.compilerMessage, r.errorMessage].filter(Boolean).join('\n')} tone="err" />}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
export default OutputConsole;