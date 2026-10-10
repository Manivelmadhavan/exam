import { ArrowLeft, Braces, ChevronDown, ChevronRight } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner, PageHeader, StatCard } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { adminApi } from '../../services/endpoints';
import type { ResultDetailRow, SubmissionStatus, ViolationType } from '../../types';
import { attemptStatusLabel, formatDateTime, formatDuration, languageLabel, verdictLabel, yearLabel } from '../../utils/format';

const verdictTone = (s: string) => (s === 'ACCEPTED' ? 'green' : s === 'NOT_ATTEMPTED' || s === 'DRAFT' ? 'gray' : s === 'WRONG_ANSWER' ? 'red' : 'amber') as 'green' | 'gray' | 'red' | 'amber';
const VIOLATION_LABEL: Record<ViolationType, string> = {
  TAB_SWITCH: 'Tab switch', WINDOW_BLUR: 'Window blur', FULLSCREEN_EXIT: 'Fullscreen exit', COPY_ATTEMPT: 'Copy attempt',
  PASTE_ATTEMPT: 'Paste attempt', CUT_ATTEMPT: 'Cut attempt', RIGHT_CLICK: 'Right click', PAGE_LEAVE: 'Page leave',
};

const Info = ({ label, value }: { label: string; value: ReactNode }) => (
  <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{value || '-'}</dd></div>
);

function QuestionCard({ d }: { d: ResultDetailRow }) {
  const [open, setOpen] = useState(false);
  const execs = d.executions ?? [];
  return (
    <Card title={`Q${d.questionNumber}. ${d.questionTitle}`} actions={<Badge tone={verdictTone(d.status)}>{verdictLabel(d.status as SubmissionStatus)}</Badge>}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Language" value={d.language ? languageLabel(d.language) : '-'} />
        <Info label="Test cases" value={`${d.passedTestCases} / ${d.totalTestCases} passed`} />
        <Info label="Marks" value={`${d.marks} / ${d.maxMarks}`} />
        <Info label="Execution time" value={d.executionTimeMs == null ? '-' : `${d.executionTimeMs} ms`} />
      </dl>
      <h3 className="mb-1.5 mt-4 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Braces className="h-4 w-4 text-brand-500" aria-hidden />Source code</h3>
      {d.sourceCode ? (
        <div className="overflow-hidden rounded-lg border border-slate-800 shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/70 px-3 py-1.5">
            <span className="flex gap-1.5" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></span>
            <span className="font-mono text-[11px] text-slate-400">{d.language ? languageLabel(d.language).toLowerCase() : 'source'}.{d.language?.toLowerCase() ?? 'txt'}</span>
          </div>
          <pre tabIndex={0} aria-label={`Source code for question ${d.questionNumber}`} className="max-h-96 overflow-auto bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 dark-scroll"><code>{d.sourceCode}</code></pre>
        </div>
      ) : <p className="text-sm text-slate-500">No code submitted.</p>}
      <div className="mt-4">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />} Test case executions ({execs.length})
        </button>
        {open && (execs.length === 0 ? <p className="mt-2 text-sm text-slate-500">No executions recorded.</p> : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <caption className="sr-only">Executions for question {d.questionNumber}</caption>
              <thead className="bg-slate-50 text-left font-semibold uppercase text-slate-500">
                <tr>{['Input', 'Expected', 'Output', 'Status', 'Time', 'Compiler / runtime message'].map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {execs.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2"><pre className="whitespace-pre-wrap font-mono">{e.input}</pre></td>
                    <td className="px-3 py-2"><pre className="whitespace-pre-wrap font-mono">{e.expectedOutput}</pre></td>
                    <td className="px-3 py-2"><pre className="whitespace-pre-wrap font-mono">{e.output}</pre></td>
                    <td className="px-3 py-2"><Badge tone={verdictTone(e.status)}>{verdictLabel(e.status)}</Badge></td>
                    <td className="whitespace-nowrap px-3 py-2">{e.executionTimeMs} ms</td>
                    <td className="px-3 py-2"><pre className="whitespace-pre-wrap font-mono text-red-700">{[e.compilerMessage, e.runtimeMessage].filter(Boolean).join('\n') || '-'}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ResultDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: r, loading, error, reload } = useAsync(() => adminApi.result(id), [id]);
  const counts = useMemo(() => {
    const m = new Map<ViolationType, number>();
    (r?.violations ?? []).forEach((v) => m.set(v.type, (m.get(v.type) ?? 0) + 1));
    return [...m.entries()];
  }, [r]);
  const back = <Link to="/admin/results" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to results</Link>;

  if (loading && !r) return <LoadingSpinner />;
  if (error || !r) return <div><div className="mb-4">{back}</div><ErrorState message={error ?? 'Result not found'} onRetry={reload} /></div>;
  const violations = r.violations.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-6">
      <div>{back}</div>
      <PageHeader title={`${r.student.name} - ${r.exam.title}`} subtitle={`Result for ${r.student.studentId}`}
        actions={<>
          <Badge tone={r.attempt.status === 'EVALUATED' ? 'green' : 'gray'}>{attemptStatusLabel(r.attempt.status)}</Badge>
          {r.attempt.autoSubmitted && <Badge tone="amber">Auto-submitted{r.attempt.finalizeReason ? `: ${r.attempt.finalizeReason}` : ''}</Badge>}
        </>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Marks" value={`${r.obtainedMarks} / ${r.totalMarks}`} tone="blue" />
        <StatCard label="Percentage" value={`${r.percentage.toFixed(1)}%`} tone="green" />
        <StatCard label="Time taken" value={formatDuration(r.timeTakenSeconds)} tone="purple" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Student">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Student ID" value={r.student.studentId} /><Info label="Name" value={r.student.name} />
            <Info label="Year" value={yearLabel(r.student.year)} /><Info label="Email" value={r.student.email} />
            <Info label="Department" value={r.student.department} /><Info label="Batch" value={r.student.batch} />
          </dl>
        </Card>
        <Card title="Exam and attempt">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Exam" value={r.exam.title} /><Info label="Target year" value={yearLabel(r.exam.year)} />
            <Info label="Duration" value={`${r.exam.durationMinutes} minutes`} /><Info label="Started" value={formatDateTime(r.attempt.startedAt)} />
            <Info label="Submitted" value={formatDateTime(r.submittedAt)} />
            <Info label="Questions" value={`${r.attemptedCount} attempted, ${r.acceptedCount} accepted, ${r.wrongAnswerCount} wrong, ${r.unansweredCount} unanswered of ${r.totalQuestions}`} />
          </dl>
        </Card>
      </div>

      <section aria-labelledby="q-heading" className="space-y-4">
        <h2 id="q-heading">Questions</h2>
        {r.details.length === 0 ? <Card><EmptyState title="No question details" /></Card> : r.details.slice().sort((a, b) => a.questionNumber - b.questionNumber).map((d) => <QuestionCard key={d.id} d={d} />)}
      </section>

      <Card title={`Violations (${violations.length})`}>
        {violations.length === 0 ? <EmptyState title="No violations recorded" /> : (
          <div className="space-y-4">
            <ul className="flex flex-wrap gap-2" aria-label="Violation counts by type">
              {counts.map(([t, n]) => <li key={t}><Badge tone="amber">{VIOLATION_LABEL[t]}: {n}</Badge></li>)}
            </ul>
            <ol className="divide-y divide-slate-100 text-sm">
              {violations.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><span className="font-medium text-slate-800">{VIOLATION_LABEL[v.type]}</span>{v.details && <span className="text-slate-500"> - {v.details}</span>}</span>
                  <time dateTime={v.createdAt} className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </div>
  );
}
