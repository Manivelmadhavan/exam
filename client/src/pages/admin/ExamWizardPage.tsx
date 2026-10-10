import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ExternalLink, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Alert, Button } from '../../components/AdminBits';
import {
  defaultExamValues, DETAIL_FIELDS, examFormSchema, ExamDetailsFields, ExamFormValues, ExamSettingsFields, SelectedQuestion, SETTING_FIELDS, toExamPayload,
} from '../../components/ExamForm';
import { TestcaseEditor } from '../../components/TestcaseEditor';
import { Badge, Card, EmptyState, ErrorState, Input, LoadingSpinner, PageHeader, SearchBar } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { ApiError, errorMessage } from '../../services/api';
import { examsApi, questionsApi } from '../../services/endpoints';
import type { Exam, TestCase } from '../../types';
import { formatDateTime, languageLabel, yearLabel } from '../../utils/format';

const STEPS = ['Details', 'Questions', 'Test cases', 'Settings', 'Preview', 'Publish'] as const;

function QuestionTests({ questionId }: { questionId: string }) {
  const { data, loading, error, reload, setData } = useAsync(() => questionsApi.listTests(questionId), [questionId]);
  if (loading && !data) return <LoadingSpinner label="Loading test cases..." className="py-4" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return <TestcaseEditor questionId={questionId} value={(data ?? []) as TestCase[]} onChange={(v) => setData(v)} />;
}

export default function ExamWizardPage({ initialStep = 0 }: { initialStep?: number }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [examId, setExamId] = useState<string | undefined>(id);
  const { data: exam, loading, error, reload } = useAsync<Exam | null>(() => (id ? examsApi.get(id) : Promise.resolve(null)), [id]);

  if (loading && !exam && id) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return <Wizard key={exam?.id ?? 'new'} exam={exam ?? undefined} examId={examId} setExamId={setExamId} initialStep={Math.min(Math.max(initialStep, 0), STEPS.length - 1)} navigate={navigate} toast={toast} />;
}

function Wizard({ exam, examId, setExamId, initialStep, navigate, toast }: {
  exam?: Exam; examId?: string; setExamId: (id: string) => void; initialStep: number;
  navigate: ReturnType<typeof useNavigate>; toast: ReturnType<typeof useToast>['toast'];
}) {
  const [step, setStep] = useState(initialStep);
  const [status, setStatus] = useState(exam?.status);
  const form = useForm<ExamFormValues>({ resolver: zodResolver(examFormSchema), defaultValues: defaultExamValues(exam), mode: 'onTouched' });
  const locked = (exam?.attemptCount ?? 0) > 0;
  const [selected, setSelected] = useState<SelectedQuestion[]>(
    () => (exam?.questions ?? []).slice().sort((a, b) => a.questionNumber - b.questionNumber).map((q) => ({ question: q.question, marks: q.marks })),
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null);
  const [serverError, setServerError] = useState<{ code: string; message: string } | null>(null);

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const available = useAsync(() => questionsApi.list({ search: debounced || undefined }), [debounced]);

  const totalMarks = useMemo(() => selected.reduce((s, q) => s + (Number.isFinite(q.marks) ? q.marks : 0), 0), [selected]);
  const values = form.watch();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const addQuestion = (q: SelectedQuestion['question']) => setSelected((s) => (s.some((x) => x.question.id === q.id) ? s : [...s, { question: q, marks: q.marks }]));
  const move = (i: number, d: -1 | 1) => setSelected((s) => { const n = s.slice(); const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const validateStep = async (s: number): Promise<boolean> => {
    setStepError(null);
    if (s === 0) return form.trigger(DETAIL_FIELDS);
    if (s === 1) {
      if (selected.length === 0) { setStepError('Add at least one question to the exam.'); return false; }
      if (selected.some((q) => !Number.isFinite(q.marks) || q.marks < 0 || q.marks > 1000)) { setStepError('Marks for each question must be between 0 and 1000.'); return false; }
      return true;
    }
    if (s === 3) return form.trigger([...SETTING_FIELDS, 'maxViolations']);
    return true;
  };
  const next = async () => { if (await validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goTo = async (target: number) => {
    if (target <= step) { setStepError(null); setStep(target); return; }
    for (let s = step; s < target; s++) if (!(await validateStep(s))) { setStep(s); return; }
    setStep(target);
  };

  const save = async (publish: boolean) => {
    setServerError(null); setStepError(null);
    const ok = await form.trigger();
    if (!ok) { setStep(0); toast('Fix the highlighted fields first', 'error'); return; }
    if (!locked && selected.length === 0) { setStep(1); setStepError('Add at least one question to the exam.'); return; }
    setSaving(publish ? 'publish' : 'draft');
    try {
      const payload = toExamPayload(form.getValues(), locked ? null : selected);
      const saved = examId ? await examsApi.update(examId, payload) : await examsApi.create(payload);
      setExamId(saved.id); setStatus(saved.status);
      if (publish) {
        const pub = await examsApi.publish(saved.id);
        setStatus(pub.status);
        toast('Exam published', 'success');
        navigate('/admin/exams');
      } else {
        toast('Draft saved', 'success');
      }
    } catch (e) {
      const code = e instanceof ApiError ? e.errorCode : '';
      setServerError({ code, message: errorMessage(e) });
    } finally { setSaving(null); }
  };

  const v = values;
  const title = exam ? 'Edit Exam' : 'Create Exam';
  return (
    <div>
      <PageHeader title={title} subtitle="Complete each step, then save as a draft or publish" actions={<Link to="/admin/exams"><Button variant="secondary">Back to exams</Button></Link>} />
      {locked && <div className="mb-4"><Alert tone="amber">Students have already started this exam, so its questions and marks are locked. You can still edit details and settings.</Alert></div>}

      <nav aria-label="Exam creation steps" className="mb-6 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-soft">
        <ol className="flex min-w-max items-center gap-0">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center">
              <button type="button" onClick={() => void goTo(i)} aria-current={i === step ? 'step' : undefined}
                className={clsx('group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  i === step ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow'
                    : i < step ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  i === step ? 'bg-white/20 text-white'
                    : i < step ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300')}>
                  {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && (
                <span aria-hidden className={clsx('mx-1 h-0.5 w-6 rounded-full transition-colors', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {stepError && <div className="mb-4"><Alert>{stepError}</Alert></div>}

      {step === 0 && <Card title="Exam details"><ExamDetailsFields form={form} locked={locked} /></Card>}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={`Selected questions (${selected.length})`} actions={<Badge tone="blue">Total marks: {totalMarks}</Badge>}>
            {selected.length === 0 ? <EmptyState title="No questions selected" description="Add questions from the list on the right." /> : (
              <ol className="space-y-3">
                {selected.map((s, i) => (
                  <li key={s.question.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900"><span className="mr-2 text-slate-500">Q{i + 1}.</span>{s.question.title}</p>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" disabled={locked || i === 0} aria-label={`Move ${s.question.title} up`} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" disabled={locked || i === selected.length - 1} aria-label={`Move ${s.question.title} down`} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" disabled={locked} aria-label={`Remove ${s.question.title}`} onClick={() => setSelected((x) => x.filter((y) => y.question.id !== s.question.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                    {!s.question.allowedLanguages.some((l) => v.languages.includes(l)) && (
                      <p className="mt-2 text-xs font-medium text-red-600">Not compatible: this question only supports {s.question.allowedLanguages.map(languageLabel).join(', ')}. Change the exam languages on the Details step.</p>
                    )}
                    <div className="mt-2 max-w-[10rem]">
                      <Input label="Marks" type="number" min={0} max={1000} disabled={locked} value={Number.isFinite(s.marks) ? s.marks : ''}
                        onChange={(e) => setSelected((x) => x.map((y) => (y.question.id === s.question.id ? { ...y, marks: e.target.value === '' ? NaN : Number(e.target.value) } : y)))} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Question bank">
            <div className="mb-3"><SearchBar value={search} onChange={setSearch} placeholder="Search questions by title" /></div>
            {available.loading && !available.data ? <LoadingSpinner /> : available.error ? <ErrorState message={available.error} onRetry={available.reload} /> :
              !available.data?.length ? <EmptyState title="No questions found" description="Create questions in the Question Bank first." action={<Link className="text-sm text-brand-600 underline" to="/admin/questions/create">Create a question</Link>} /> : (
                <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
                  {available.data.map((q) => {
                    const added = selected.some((s) => s.question.id === q.id);
                    return (
                      <li key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{q.title}</p>
                          <p className="text-xs text-slate-500">{q.marks} marks - {q._count?.testCases ?? 0} tests - {q.allowedLanguages.map(languageLabel).join(', ')}</p>
                        </div>
                        <Button size="sm" variant={added ? 'secondary' : 'primary'} disabled={added || locked} icon={added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          aria-label={`${added ? 'Added' : 'Add'} ${q.title}`} onClick={() => addQuestion(q)}>{added ? 'Added' : 'Add'}</Button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Alert tone="blue">Test case changes are saved to the question immediately and apply to every exam that uses it. Every question needs at least one test case before publishing.</Alert>
          {selected.length === 0 ? <Card><EmptyState title="No questions selected" description="Go back and add questions first." /></Card> : selected.map((s, i) => (
            <Card key={s.question.id} title={`Q${i + 1}. ${s.question.title}`}><QuestionTests questionId={s.question.id} /></Card>
          ))}
        </div>
      )}

      {step === 3 && <Card title="Exam settings"><ExamSettingsFields form={form} /></Card>}

      {step === 4 && (
        <Card title="Preview" actions={examId ? <Link to={`/admin/exams/${examId}/preview`}><Button variant="secondary" size="sm" icon={<ExternalLink className="h-4 w-4" />}>Open student preview</Button></Link> : undefined}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {([
              ['Title', v.title], ['Target year', yearLabel(v.year)], ['Duration', `${v.durationMinutes} minutes`], ['Total marks', totalMarks],
              ['Languages', v.languages.map(languageLabel).join(', ')],
              ['Starts', formatDateTime(new Date(v.startDateTime).toString() === 'Invalid Date' ? null : new Date(v.startDateTime).toISOString())],
              ['Ends', formatDateTime(new Date(v.endDateTime).toString() === 'Invalid Date' ? null : new Date(v.endDateTime).toISOString())],
              ['Scoring', v.scoringMode === 'PROPORTIONAL' ? 'Proportional' : 'Full marks only'], ['Submission policy', v.submissionPolicy === 'BEST' ? 'Best submission' : 'Latest submission'],
              ['Show verdict', v.showVerdict ? 'Yes' : 'No'], ['Strict whitespace', v.strictWhitespace ? 'Yes' : 'No'],
              ['Fullscreen required', v.fullscreenRequired ? 'Yes' : 'No'], ['Copy/paste disabled', v.disableCopyPaste ? 'Yes' : 'No'],
              ['Right-click disabled', v.disableRightClick ? 'Yes' : 'No'], ['Tab-switch detection', v.tabSwitchDetection ? 'Yes' : 'No'],
              ['Max violations', v.maxViolations === 0 ? 'No limit' : v.maxViolations], ['Auto-submit on limit', v.autoSubmit ? 'Yes' : 'No'],
            ] as Array<[string, React.ReactNode]>).map(([k, val]) => (
              <div key={k}><dt className="text-xs font-medium uppercase text-slate-500">{k}</dt><dd className="text-sm text-slate-800">{val || '-'}</dd></div>
            ))}
          </dl>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-800">Questions ({selected.length})</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {selected.map((s) => <li key={s.question.id}>{s.question.title} <span className="text-slate-500">({s.marks} marks)</span></li>)}
          </ol>
          {!examId && <p className="mt-4 text-sm text-slate-500">Save the draft to enable the student preview.</p>}
        </Card>
      )}

      {step === 5 && (
        <Card title="Save or publish">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {v.title || 'Untitled exam'} - {selected.length} question{selected.length === 1 ? '' : 's'}, {totalMarks} total marks.
              {status && <> Current status: <Badge tone={status === 'PUBLISHED' ? 'green' : 'gray'}>{status}</Badge></>}
            </p>
            {serverError && (
              <Alert>
                <strong>{serverError.code === 'EXAM_LOCKED' ? 'Exam is locked: ' : serverError.code === 'EXAM_INCOMPLETE' ? 'Exam is incomplete: ' : 'Could not save: '}</strong>
                {serverError.message}
                {serverError.code === 'EXAM_INCOMPLETE' && ' The draft was saved; fix the issue (for example add test cases in step 3) and publish again.'}
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" icon={<Save className="h-4 w-4" />} loading={saving === 'draft'} disabled={!!saving} onClick={() => void save(false)}>Save Draft</Button>
              <Button icon={<Send className="h-4 w-4" />} loading={saving === 'publish'} disabled={!!saving} onClick={() => void save(true)}>Publish Exam</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" disabled={step === 0} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => { setStepError(null); setStep((s) => Math.max(0, s - 1)); }}>Back</Button>
        {step < STEPS.length - 1 && <Button onClick={() => void next()}>Next <ChevronRight className="h-4 w-4" aria-hidden /></Button>}
      </div>
    </div>
  );
}
