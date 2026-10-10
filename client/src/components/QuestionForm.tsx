import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, FlaskConical, Pencil, Play } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../services/api';
import { adminApi } from '../services/endpoints';
import type { Language, Question, TestCase } from '../types';
import { ALL_LANGUAGES, languageLabel } from '../utils/format';
import { Markdown } from './Markdown';
import { TestcaseEditor } from './TestcaseEditor';
import { Card, Checkbox, Input, Select, Textarea } from './ui';
import { Alert, Button } from './AdminBits';

export const questionFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  problemStatement: z.string().trim().min(1, 'Problem statement is required').max(20000),
  inputFormat: z.string().max(5000), outputFormat: z.string().max(5000), constraints: z.string().max(5000), explanation: z.string().max(5000),
  sampleInput: z.string().max(10000), sampleOutput: z.string().max(10000),
  marks: z.number({ invalid_type_error: 'Marks is required' }).min(0, 'Cannot be negative').max(1000),
  timeLimitMs: z.number({ invalid_type_error: 'Required' }).int().min(100, 'Minimum 100 ms').max(10000, 'Maximum 10000 ms'),
  memoryLimitMb: z.number({ invalid_type_error: 'Required' }).int().min(16, 'Minimum 16 MB').max(1024, 'Maximum 1024 MB'),
  allowedLanguages: z.array(z.enum(['PYTHON', 'JAVA', 'CPP'])).min(1, 'Select at least one language'),
});
export type QuestionFormValues = z.infer<typeof questionFormSchema>;

function Sandbox({ values }: { values: QuestionFormValues }) {
  const { toast } = useToast();
  const [language, setLanguage] = useState<Language>(values.allowedLanguages[0] ?? 'PYTHON');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ status: string; output: string; ms: number; message?: string } | null>(null);
  const run = async () => {
    setBusy(true); setOut(null);
    try {
      const r = await adminApi.run({ language, sourceCode: code, input: values.sampleInput, timeLimitMs: values.timeLimitMs, memoryLimitMb: values.memoryLimitMb });
      setOut({ status: r.status, output: r.output, ms: r.executionTimeMs, message: r.compilerMessage || r.errorMessage });
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  const matches = out && out.status === 'SUCCESS' ? out.output.trim() === values.sampleOutput.trim() : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Run a reference solution against the sample input to check the sample output and limits. Nothing is saved.</p>
      <div className="w-44"><Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
        {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{languageLabel(l)}</option>)}</Select></div>
      <Textarea label="Reference solution" rows={8} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <Button size="sm" icon={<Play className="h-4 w-4" />} loading={busy} disabled={!code.trim()} onClick={() => void run()}>Run on sample input</Button>
      {out && (
        <div className="space-y-2 text-sm" aria-live="polite">
          <p>Status: <strong>{out.status}</strong> - {out.ms} ms {matches === true && <span className="text-emerald-700">- matches sample output</span>}{matches === false && <span className="text-red-700">- differs from sample output</span>}</p>
          {out.message && <pre className="overflow-x-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">{out.message}</pre>}
          <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">{out.output || '(no output)'}</pre>
        </div>
      )}
    </div>
  );
}

/** Create (test cases kept locally and sent with the question) or edit (test cases persisted individually). */
export function QuestionForm({ question, onSubmit, onCancel }: {
  question?: Question;
  onSubmit: (values: QuestionFormValues, testCases: TestCase[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [cases, setCases] = useState<TestCase[]>(question?.testCases ?? [{ input: '', expectedOutput: '', isSample: true, weight: 1 }]);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      title: question?.title ?? '', problemStatement: question?.problemStatement ?? '', inputFormat: question?.inputFormat ?? '', outputFormat: question?.outputFormat ?? '',
      constraints: question?.constraints ?? '', explanation: question?.explanation ?? '', sampleInput: question?.sampleInput ?? '', sampleOutput: question?.sampleOutput ?? '',
      marks: question?.marks ?? 10, timeLimitMs: question?.timeLimitMs ?? 2000, memoryLimitMb: question?.memoryLimitMb ?? 256,
      allowedLanguages: question?.allowedLanguages ?? ['PYTHON', 'JAVA', 'CPP'],
    },
  });
  const langs = watch('allowedLanguages');
  const statement = watch('problemStatement');
  const [sandbox, setSandbox] = useState(false);
  const toggleLang = (l: Language, on: boolean) =>
    setValue('allowedLanguages', on ? [...langs.filter((x) => x !== l), l] : langs.filter((x) => x !== l), { shouldValidate: true, shouldDirty: true });

  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(async (v) => {
      setError(null);
      if (!question) {
        if (cases.length === 0) { setError('Add at least one test case.'); return; }
        if (cases.some((c) => !c.expectedOutput.length)) { setError('Every test case needs an expected output.'); return; }
      }
      try { await onSubmit(v, cases); } catch (e) { setError(errorMessage(e)); }
    })}>
      {error && <Alert>{error}</Alert>}
      <Card title="Problem">
        <div className="space-y-4">
          <Input label="Title *" error={errors.title?.message} {...register('title')} />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="problemStatement" className="text-sm font-medium text-slate-700">Problem statement * (Markdown)</label>
              <button type="button" aria-pressed={preview} onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
                {preview ? <><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Preview</>}
              </button>
            </div>
            {preview
              ? <div className="min-h-[160px] rounded-lg border border-slate-200 bg-slate-50 p-4">{statement.trim() ? <Markdown>{statement}</Markdown> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}</div>
              : <Textarea id="problemStatement" rows={8} error={errors.problemStatement?.message} {...register('problemStatement')} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea label="Input format" rows={3} {...register('inputFormat')} />
            <Textarea label="Output format" rows={3} {...register('outputFormat')} />
            <Textarea label="Constraints" rows={3} {...register('constraints')} />
            <Textarea label="Explanation" rows={3} {...register('explanation')} />
            <Textarea label="Sample input" rows={3} {...register('sampleInput')} />
            <Textarea label="Sample output" rows={3} {...register('sampleOutput')} />
          </div>
        </div>
      </Card>

      <Card title="Limits and languages">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Marks *" type="number" step="any" min={0} error={errors.marks?.message} {...register('marks', { valueAsNumber: true })} />
          <Input label="Time limit (ms)" type="number" error={errors.timeLimitMs?.message} {...register('timeLimitMs', { valueAsNumber: true })} />
          <Input label="Memory limit (MB)" type="number" error={errors.memoryLimitMb?.message} {...register('memoryLimitMb', { valueAsNumber: true })} />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-slate-700">Allowed languages *</legend>
          <div className="flex flex-wrap gap-5">
            {ALL_LANGUAGES.map((l) => <Checkbox key={l} label={languageLabel(l)} checked={langs.includes(l)} onChange={(e) => toggleLang(l, e.target.checked)} />)}
          </div>
          {errors.allowedLanguages && <p role="alert" className="mt-1 text-xs text-red-600">{errors.allowedLanguages.message}</p>}
        </fieldset>
      </Card>

      <Card title="Test cases" actions={question ? <span className="text-xs text-slate-500">Changes here are saved immediately</span> : undefined}>
        <TestcaseEditor value={cases} onChange={setCases} questionId={question?.id} />
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden /> Try in sandbox</span>}
        actions={<Button size="sm" variant="secondary" aria-expanded={sandbox} onClick={() => setSandbox((s) => !s)}>{sandbox ? 'Hide' : 'Show'}</Button>}>
        {sandbox ? <Sandbox values={getValues()} /> : <p className="text-sm text-slate-500">Optional: verify the sample with a reference solution.</p>}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{question ? 'Save question' : 'Create question'}</Button>
      </div>
    </form>
  );
}
