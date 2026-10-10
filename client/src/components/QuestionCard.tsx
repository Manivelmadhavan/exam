import clsx from 'clsx';
import { Clock, MemoryStick } from 'lucide-react';
import type { ExamQuestionView } from '../types';
import { Badge } from './ui';
import { Markdown } from './Markdown';

const Section = ({ title, children }: { title: string; children: string }) =>
  children.trim() ? (
    <section className="mt-5">
      <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      <div className="rounded-r-lg border-l-2 border-brand-200 bg-slate-50/60 pl-4"><Markdown>{children}</Markdown></div>
    </section>
  ) : null;
const Block = ({ label, text }: { label: string; text: string }) => (
  <div>
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-3 font-mono text-xs leading-relaxed text-slate-100 shadow-soft">{text}</pre>
  </div>
);

export function QuestionCard({ question, index, total, noSelect }: { question: ExamQuestionView; index: number; total: number; noSelect?: boolean }) {
  const samples = question.sampleTests.length ? question.sampleTests : question.sampleInput || question.sampleOutput ? [{ id: 'legacy', input: question.sampleInput, expectedOutput: question.sampleOutput }] : [];
  return (
    <article aria-labelledby="question-title" className={clsx('card relative overflow-hidden p-5', noSelect && 'no-select')}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-accent-500" />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-sm font-bold text-white shadow-md">{index + 1}</span>
            Question {index + 1} of {total}
          </p>
          <h2 id="question-title" className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">{question.title}</h2>
        </div>
        <Badge tone="blue" className="text-sm">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</Badge>
      </div>
      <div className="mt-4"><Markdown>{question.problemStatement}</Markdown></div>
      <Section title="Input Format">{question.inputFormat}</Section>
      <Section title="Output Format">{question.outputFormat}</Section>
      <Section title="Constraints">{question.constraints}</Section>
      {samples.map((s, i) => (
        <section key={s.id} className="mt-5" aria-label={`Sample ${i + 1}`}>
          <h3 className="mb-2 text-sm font-bold text-slate-700">Sample {samples.length > 1 ? i + 1 : ''}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Block label="Input" text={s.input} />
            <Block label="Output" text={s.expectedOutput} />
          </div>
        </section>
      ))}
      <Section title="Explanation">{question.explanation}</Section>
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-500" aria-hidden />Time limit {question.timeLimitMs} ms</span>
        <span className="inline-flex items-center gap-1.5"><MemoryStick className="h-3.5 w-3.5 text-accent-500" aria-hidden />Memory limit {question.memoryLimitMb} MB</span>
      </p>
    </article>
  );
}
export default QuestionCard;