import { CheckCircle2, MessageSquareHeart, Send } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Button, Alert } from '../../components/AdminBits';
import { Card, LoadingSpinner, PageHeader, Input, Textarea } from '../../components/ui';
import { Reveal } from '../../components/motion/Reveal';
import { useAuth } from '../../context/AuthContext';
import { ApiError, errorMessage } from '../../services/api';
import { feedbackApi } from '../../services/endpoints';
import type { FeedbackClassYear, FeedbackIssue, FeedbackPayload } from '../../types';

const YEAR_OPTIONS: FeedbackClassYear[] = ['1st Year', '2nd Year', '3rd Year', 'Other'];
const LANGUAGE_OPTIONS = ['Java', 'Python', 'C++'] as const;
const READABILITY_OPTIONS = ['Very Easy', 'Easy', 'Average', 'Difficult'] as const;
const RUN_CODE_OPTIONS = ['Yes, perfectly', 'Yes, but with some issues', 'No', 'I did not use this feature'] as const;
const TIMER_OPTIONS = ['Yes', 'Partially', 'No'] as const;
const TIME_SUFFICIENT_OPTIONS = ['Yes', 'No', 'Somewhat'] as const;
const LANGUAGE_SUPPORT_OPTIONS = ['Yes', 'No', 'I experienced some issues'] as const;
const RESULTS_OPTIONS = ['Yes', 'No', 'Not sure'] as const;
const ISSUE_OPTIONS: FeedbackIssue[] = ['No issues', 'Login issues', 'Code execution issues', 'Slow performance', 'Timer issues', 'Submission or result issues', 'Other'];
const REUSE_OPTIONS = ['Yes', 'No', 'Maybe'] as const;

interface FormState {
  studentName: string; studentId: string;
  classYear: '' | FeedbackClassYear; language: '' | 'Java' | 'Python' | 'C++';
  loginEase: number; uiRating: number; problemReadability: string; codeEditorRating: number;
  runCodeWorks: string; inputOutputEase: string; timerVisible: string; timeSufficient: string;
  languageSupport: string; executionSpeed: number; resultsDisplayed: string; overallSatisfaction: number;
  likedMost: string; issuesSeen: FeedbackIssue[]; improvements: string; useAgain: string;
}

export default function FeedbackFormPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(() => ({
    studentName: user?.name ?? '', studentId: user?.studentId ?? '',
    classYear: '', language: '', loginEase: 0, uiRating: 0, problemReadability: '', codeEditorRating: 0,
    runCodeWorks: '', inputOutputEase: '', timerVisible: '', timeSufficient: '', languageSupport: '',
    executionSpeed: 0, resultsDisplayed: '', overallSatisfaction: 0, likedMost: '', issuesSeen: [], improvements: '', useAgain: '',
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState<{ submitted: boolean; submittedAt?: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let live = true;
    feedbackApi.mine()
      .then((s) => { if (live) { setAlready(s); setDone(s.submitted); } })
      .catch(() => { if (live) setAlready({ submitted: false }); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const requiredMissing = (): string[] => {
    const missing: string[] = [];
    const checks: Array<[string, unknown]> = [
      ['Student name', form.studentName.trim()], ['Student ID', form.studentId.trim()], ['Class / Year', form.classYear],
      ['Programming language', form.language], ['Q5 · how easy it was to log in', form.loginEase], ['Q6 · UI and design', form.uiRating],
      ['Q7 · was the problem statement easy to read', form.problemReadability], ['Q8 · experience using the code editor', form.codeEditorRating],
      ['Q9 · did the Run Code feature work', form.runCodeWorks], ['Q10 · input and output panels', form.inputOutputEase],
      ['Q11 · exam timer', form.timerVisible], ['Q12 · time allotted', form.timeSufficient], ['Q13 · language support', form.languageSupport],
      ['Q14 · code execution speed', form.executionSpeed], ['Q15 · marks and results displayed', form.resultsDisplayed],
      ['Q16 · overall satisfaction', form.overallSatisfaction], ['Q20 · would you use this again', form.useAgain],
    ];
    for (const [label, v] of checks) {
      if (typeof v === 'number' ? v === 0 : !v) missing.push(`${label}: please choose an answer`);
    }
    return missing;
  };

  const saveValid = (): FeedbackPayload => {
    const valid = (n: number) => (Number.isFinite(n) && n >= 1 && n <= 5 ? n : 1);
    return {
      studentName: form.studentName.trim(), studentId: form.studentId.trim(),
      classYear: (form.classYear || 'Other') as FeedbackClassYear, language: (form.language || 'Python') as 'Java' | 'Python' | 'C++',
      loginEase: valid(form.loginEase), uiRating: valid(form.uiRating), problemReadability: form.problemReadability || 'Average',
      codeEditorRating: valid(form.codeEditorRating), runCodeWorks: form.runCodeWorks || 'I did not use this feature',
      inputOutputEase: form.inputOutputEase || 'Average', timerVisible: form.timerVisible || 'Yes', timeSufficient: form.timeSufficient || 'Yes',
      languageSupport: form.languageSupport || 'Yes', executionSpeed: valid(form.executionSpeed), resultsDisplayed: form.resultsDisplayed || 'Yes',
      overallSatisfaction: valid(form.overallSatisfaction), likedMost: form.likedMost.trim() || null,
      issuesSeen: form.issuesSeen, improvements: form.improvements.trim() || null, useAgain: form.useAgain || 'Yes',
    };
  };

  const submit = async () => {
    const missing = requiredMissing();
    setErrors(missing);
    if (missing.length) return;
    setBusy(true);
    try { await feedbackApi.submit(saveValid()); setDone(true); }
    catch (e) {
      if (e instanceof ApiError && e.errorCode === 'ALREADY_SUBMITTED') setDone(true);
      else setErrors([errorMessage(e)]);
    } finally { setBusy(false); }
  };

  if (checking) return <LoadingSpinner className="min-h-[50vh]" label="Checking your submission..." />;

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <Reveal animation="scale-in">
          <Card className="px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-glow">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </div>
            <h1 className="mt-5 text-2xl">Thank you for your feedback!</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
              {already?.submitted
                ? 'You have already submitted your feedback for this platform. Only one submission per student is allowed.'
                : 'Thank you for sharing your valuable feedback! Your suggestions will help us improve the online programming examination platform and provide a better learning and examination experience.'}
              {already?.submittedAt && <span className="mt-2 block text-xs">Submitted on {new Date(already.submittedAt).toLocaleString()}</span>}
            </p>
          </Card>
        </Reveal>
      </div>
    );
  }

  const Errors = () => (errors.length > 0 ? (
    <div className="space-y-2">
      {errors.map((e) => <Alert key={e}>{e}</Alert>)}
    </div>
  ) : null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Share your feedback"
        subtitle="Thank you for participating in our online programming examination. Your feedback will help us improve the application's user interface, coding experience, exam functionality, and overall performance. This form takes about 2–3 minutes to complete." />

      <Errors />

      <Reveal animation="fade-up" delay="1">
        <Card title={<span className="flex items-center gap-2 text-slate-900"><MessageSquareHeart className="h-5 w-5 text-brand-600" aria-hidden />Section 1 · Student Details</span>}>
          <div className="space-y-4">
            <Input label="1. Student Name *" value={form.studentName} onChange={(e) => set('studentName', e.target.value)} placeholder="Your full name" />
            <Input label="2. Student ID *" value={form.studentId} onChange={(e) => set('studentId', e.target.value)} placeholder="e.g. STU001" />
            <Choice label="3. Class / Year *" value={form.classYear} options={[...YEAR_OPTIONS]}
              onPick={(v) => set('classYear', v as FeedbackClassYear)} />
            <Choice label="4. Which programming language did you use? *" value={form.language} options={[...LANGUAGE_OPTIONS]}
              onPick={(v) => set('language', v as 'Java' | 'Python' | 'C++')} />
          </div>
        </Card>
      </Reveal>

      <Reveal animation="fade-up" delay="2">
        <Card title="Section 2 · Application Experience">
          <div className="space-y-6">
            <Scale label="5. How easy was it to log in and access the examination? *" low="Very difficult" high="Very easy" value={form.loginEase} onChange={(v) => set('loginEase', v)} />
            <Scale label="6. How would you rate the application's user interface and design? *" low="Poor" high="Excellent" value={form.uiRating} onChange={(v) => set('uiRating', v)} />
            <Choice label="7. Was the problem statement easy to read and understand? *" value={form.problemReadability} options={[...READABILITY_OPTIONS]} onPick={(v) => set('problemReadability', v)} />
            <Scale label="8. How was your experience using the code editor? *" low="Very poor" high="Excellent" value={form.codeEditorRating} onChange={(v) => set('codeEditorRating', v)} />
            <Choice label="9. Was the Run Code feature working correctly? *" value={form.runCodeWorks} options={[...RUN_CODE_OPTIONS]} onPick={(v) => set('runCodeWorks', v)} />
            <Choice label="10. Were the input and output panels easy to use? *" value={form.inputOutputEase} options={[...READABILITY_OPTIONS]} onPick={(v) => set('inputOutputEase', v)} />
          </div>
        </Card>
      </Reveal>

      <Reveal animation="fade-up" delay="3">
        <Card title="Section 3 · Examination Experience">
          <div className="space-y-6">
            <Choice label="11. Was the examination timer clearly visible and accurate? *" value={form.timerVisible} options={[...TIMER_OPTIONS]} onPick={(v) => set('timerVisible', v)} />
            <Choice label="12. Was the time allotted for the examination sufficient? *" value={form.timeSufficient} options={[...TIME_SUFFICIENT_OPTIONS]} onPick={(v) => set('timeSufficient', v)} />
            <Choice label="13. Did the application support your selected programming language correctly? *" value={form.languageSupport} options={[...LANGUAGE_SUPPORT_OPTIONS]} onPick={(v) => set('languageSupport', v)} />
            <Scale label="14. How satisfied are you with the code execution speed? *" low="Very slow" high="Very fast" value={form.executionSpeed} onChange={(v) => set('executionSpeed', v)} />
            <Choice label="15. Were your marks and examination results displayed correctly? *" value={form.resultsDisplayed} options={[...RESULTS_OPTIONS]} onPick={(v) => set('resultsDisplayed', v)} />
          </div>
        </Card>
      </Reveal>

      <Reveal animation="fade-up" delay="4">
        <Card title="Section 4 · Overall Feedback">
          <div className="space-y-6">
            <Scale label="16. Overall, how satisfied are you with the application? *" low="Very dissatisfied" high="Very satisfied" value={form.overallSatisfaction} onChange={(v) => set('overallSatisfaction', v)} />
            <Textarea label="17. What did you like most about the application?" rows={3} value={form.likedMost} onChange={(e) => set('likedMost', e.target.value)} />
            <MultiChoice label="18. Did you experience any errors or technical problems during the exam? (Select all that apply)" value={form.issuesSeen} options={ISSUE_OPTIONS}
              onToggle={(v) => set('issuesSeen', form.issuesSeen.includes(v) ? form.issuesSeen.filter((x) => x !== v) : [...form.issuesSeen, v])} />
            <Textarea label="19. What improvements would you suggest for the application?" rows={3} value={form.improvements} onChange={(e) => set('improvements', e.target.value)} />
            <Choice label="20. Would you like to use this application for future programming examinations? *" value={form.useAgain} options={[...REUSE_OPTIONS]} onPick={(v) => set('useAgain', v)} />
          </div>
        </Card>
      </Reveal>

      <Reveal animation="fade-up" delay="4" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Fields marked <span className="font-semibold text-slate-700">*</span> are required.</p>
        <Button icon={<Send className="h-4 w-4" />} loading={busy} onClick={() => void submit()}>Submit feedback</Button>
      </Reveal>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold text-slate-700">{children}</p>;
}

/* 1–5 rating */
function Scale({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset aria-label={label}>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button key={n} type="button" aria-pressed={active} onClick={() => onChange(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 ${active ? 'border-transparent bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-4 text-xs text-slate-400"><span>{low} <span className="text-slate-600">(1)</span></span><span>(5) {high}</span></div>
    </fieldset>
  );
}

/* single-select pill buttons */
function Choice({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <fieldset aria-label={label}>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button key={o} type="button" aria-pressed={active} onClick={() => onPick(o)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 ${active ? 'border-transparent bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* multi-select chip toggles */
function MultiChoice({ label, value, options, onToggle }: { label: string; value: FeedbackIssue[]; options: readonly FeedbackIssue[]; onToggle: (v: FeedbackIssue) => void }) {
  return (
    <fieldset aria-label={label}>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button key={o} type="button" aria-pressed={active} onClick={() => onToggle(o)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 ${active ? 'border-transparent bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>
              {active && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />}{o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}