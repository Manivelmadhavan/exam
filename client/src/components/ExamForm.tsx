import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import clsx from 'clsx';
import type { Exam, Language, Question } from '../types';
import { toLocalInput, languageLabel } from '../utils/format';
import { Checkbox, Input, Select, Textarea } from './ui';

export const ALL_EXAM_LANGUAGES: Language[] = ['PYTHON', 'JAVA', 'CPP'];

export const examFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000),
  year: z.enum(['ONE_YEAR', 'TWO_YEAR', 'BOTH']),
  durationMinutes: z.number({ invalid_type_error: 'Duration is required' }).int('Whole minutes only').min(1, 'At least 1 minute').max(600, 'At most 600 minutes'),
  instructions: z.string().max(10000),
  startDateTime: z.string().min(1, 'Start time is required'),
  endDateTime: z.string().min(1, 'End time is required'),
  languages: z.array(z.enum(['PYTHON', 'JAVA', 'CPP'])).min(1, 'Select at least one language'),
  fullscreenRequired: z.boolean(),
  disableCopyPaste: z.boolean(),
  disableRightClick: z.boolean(),
  tabSwitchDetection: z.boolean(),
  autoSubmit: z.boolean(),
  maxViolations: z.number({ invalid_type_error: 'Enter 0-100' }).int().min(0, 'Minimum 0').max(100, 'Maximum 100'),
  scoringMode: z.enum(['PROPORTIONAL', 'FULL_MARKS']),
  submissionPolicy: z.enum(['BEST', 'LATEST']),
  showVerdict: z.boolean(),
  strictWhitespace: z.boolean(),
}).refine((v) => !v.startDateTime || !v.endDateTime || new Date(v.endDateTime) > new Date(v.startDateTime), { path: ['endDateTime'], message: 'End time must be after start time' });
export type ExamFormValues = z.infer<typeof examFormSchema>;
export type ExamFormApi = UseFormReturn<ExamFormValues>;

export interface SelectedQuestion { question: Question; marks: number }

export const DETAIL_FIELDS: Array<keyof ExamFormValues> = ['title', 'description', 'year', 'durationMinutes', 'instructions', 'startDateTime', 'endDateTime', 'languages'];
export const SETTING_FIELDS: Array<keyof ExamFormValues> = ['maxViolations', 'scoringMode', 'submissionPolicy'];

export function defaultExamValues(exam?: Exam): ExamFormValues {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const start = exam ? exam.startDateTime : new Date(now.getTime() + 24 * 3600_000).toISOString();
  const end = exam ? exam.endDateTime : new Date(now.getTime() + 48 * 3600_000).toISOString();
  return {
    title: exam?.title ?? '', description: exam?.description ?? '', year: exam?.year ?? 'ONE_YEAR', durationMinutes: exam?.durationMinutes ?? 60,
    instructions: exam?.instructions ?? '', startDateTime: toLocalInput(start), endDateTime: toLocalInput(end),
    languages: exam?.languages?.length ? exam.languages : [...ALL_EXAM_LANGUAGES],
    fullscreenRequired: exam?.fullscreenRequired ?? false, disableCopyPaste: exam?.disableCopyPaste ?? true, disableRightClick: exam?.disableRightClick ?? true,
    tabSwitchDetection: exam?.tabSwitchDetection ?? true, autoSubmit: exam?.autoSubmit ?? true, maxViolations: exam?.maxViolations ?? 3,
    scoringMode: exam?.scoringMode ?? 'PROPORTIONAL', submissionPolicy: exam?.submissionPolicy ?? 'BEST',
    showVerdict: exam?.showVerdict ?? true, strictWhitespace: exam?.strictWhitespace ?? false,
  };
}

/** Payload matching the server's examBodySchema. `questions` is omitted when the exam is locked. */
export function toExamPayload(v: ExamFormValues, selected: SelectedQuestion[] | null) {
  return {
    ...v,
    startDateTime: new Date(v.startDateTime).toISOString(),
    endDateTime: new Date(v.endDateTime).toISOString(),
    ...(selected ? { questions: selected.map((s) => ({ questionId: s.question.id, marks: s.marks })) } : {}),
  };
}

export function ExamDetailsFields({ form, locked }: { form: ExamFormApi; locked?: boolean }) {
  const { register, watch, setValue, formState: { errors } } = form;
  const languages = watch('languages') ?? [];
  const toggleLanguage = (l: Language) => {
    if (locked) return;
    const next = languages.includes(l) ? languages.filter((x) => x !== l) : [...languages, l];
    setValue('languages', next, { shouldValidate: true, shouldDirty: true });
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Input label="Exam title *" error={errors.title?.message} {...register('title')} disabled={locked} /></div>
      <div className="sm:col-span-2"><Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} /></div>
      <Select label="Target year *" error={errors.year?.message} {...register('year')} disabled={locked}>
        <option value="ONE_YEAR">1 Year</option><option value="TWO_YEAR">2 Year</option><option value="BOTH">Both years</option>
      </Select>
      <Input label="Duration (minutes) *" type="number" min={1} error={errors.durationMinutes?.message} {...register('durationMinutes', { valueAsNumber: true })} disabled={locked} />
      <fieldset className="sm:col-span-2" aria-label="Programming languages">
        <legend className="text-sm font-semibold text-slate-700">Programming languages *</legend>
        <p className="mb-2 text-xs text-slate-500">{locked ? 'Students have started this exam, so its languages are locked.' : 'Students can solve every question only in the languages selected here.'}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ALL_EXAM_LANGUAGES.map((l) => {
            const active = languages.includes(l);
            return (
              <button key={l} type="button" aria-pressed={active} disabled={locked} onClick={() => toggleLanguage(l)}
                className={clsx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed',
                  active ? 'border-brand-500/60 bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50')}>
                <span className={clsx('h-2 w-2 rounded-full', l === 'PYTHON' ? 'bg-emerald-400' : l === 'JAVA' ? 'bg-orange-400' : 'bg-sky-400')} aria-hidden />
                {languageLabel(l)}
              </button>
            );
          })}
        </div>
        {errors.languages && <p role="alert" className="mt-1.5 animate-fade-in text-xs font-medium text-red-600">{errors.languages.message}</p>}
      </fieldset>
      <Input label="Start date and time *" type="datetime-local" error={errors.startDateTime?.message} {...register('startDateTime')} disabled={locked} />
      <Input label="End date and time *" type="datetime-local" error={errors.endDateTime?.message} {...register('endDateTime')} hint="Students can start until this time; an attempt never runs past it." disabled={locked} />
      <div className="sm:col-span-2"><Textarea label="Instructions (Markdown supported)" rows={6} error={errors.instructions?.message} {...register('instructions')} /></div>
    </div>
  );
}

export function ExamSettingsFields({ form }: { form: ExamFormApi }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Proctoring</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox label="Fullscreen required" {...register('fullscreenRequired')} />
          <Checkbox label="Disable copy / paste / cut" {...register('disableCopyPaste')} />
          <Checkbox label="Disable right-click" {...register('disableRightClick')} />
          <Checkbox label="Detect tab switch / window blur" {...register('tabSwitchDetection')} />
          <Checkbox label="Auto-submit when the violation limit is reached" {...register('autoSubmit')} />
        </div>
        <div className="mt-3 max-w-xs">
          <Input label="Maximum violations" type="number" min={0} max={100} error={errors.maxViolations?.message} hint="0 means no limit" {...register('maxViolations', { valueAsNumber: true })} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Evaluation</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Scoring mode" {...register('scoringMode')}>
            <option value="PROPORTIONAL">Proportional (by passed test cases)</option><option value="FULL_MARKS">Full marks only</option>
          </Select>
          <Select label="Submission policy" {...register('submissionPolicy')}>
            <option value="BEST">Best submission counts</option><option value="LATEST">Latest submission counts</option>
          </Select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Checkbox label="Show verdict to students after each submission" {...register('showVerdict')} />
          <Checkbox label="Strict whitespace comparison" hint="Otherwise trailing whitespace is ignored" {...register('strictWhitespace')} />
        </div>
      </fieldset>
      <p className="text-xs text-slate-500">Browser restrictions are a deterrent only. The server always enforces the exam time limit and submission state.</p>
    </div>
  );
}
