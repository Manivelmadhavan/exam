import { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, CheckSquare2, ChevronLeft, ChevronRight, Cloud, CloudOff, Eye, Loader2, Maximize, Play, RotateCcw, Save, Send, TestTubes, WifiOff } from 'lucide-react';
import { Button } from '../../components/AdminBits';
import { ConfirmDialog, ErrorState, LoadingSpinner, Modal, Textarea } from '../../components/ui';
import { useEffect } from 'react';
import { CodeEditor } from '../../components/CodeEditor';
import { LanguageSelector } from '../../components/LanguageSelector';
import { OutputConsole } from '../../components/OutputConsole';
import { QuestionCard } from '../../components/QuestionCard';
import { QuestionNavigator } from '../../components/QuestionNavigator';
import { Timer } from '../../components/Timer';
import { useExamSession, WorkspaceProps, SaveState } from './useExamSession';
import { useRef } from 'react';

function NetworkBadge({ online, saveState }: { online: boolean; saveState: SaveState }) {
  const [icon, text, tone] = !online ? [<WifiOff key="i" className="h-3.5 w-3.5" aria-hidden />, 'Offline - code saved locally', 'bg-red-50 text-red-700 ring-red-200']
    : saveState === 'saving' ? [<Loader2 key="i" className="h-3.5 w-3.5 animate-spin" aria-hidden />, 'Saving...', 'bg-brand-50 text-brand-700 ring-brand-200']
    : saveState === 'error' ? [<CloudOff key="i" className="h-3.5 w-3.5" aria-hidden />, 'Save failed - retrying', 'bg-amber-50 text-amber-800 ring-amber-200']
    : saveState === 'saved' ? [<Cloud key="i" className="h-3.5 w-3.5" aria-hidden />, 'Saved', 'bg-emerald-50 text-emerald-700 ring-emerald-200']
    : [<Cloud key="i" className="h-3.5 w-3.5" aria-hidden />, 'Online', 'bg-slate-100 text-slate-700 ring-slate-200'];
  return <span role="status" className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1', tone)}>{icon}{text}</span>;
}

const FINISH_COPY = {
  manual: { title: 'Evaluating your answers...', done: 'Your exam has been submitted.' },
  auto: { title: 'Time is over.', done: 'Time is over. Your exam has been automatically submitted.' },
  closed: { title: 'This exam has ended.', done: 'This exam has ended. Your answers have been submitted.' },
  violation: { title: 'Maximum violations reached.', done: 'Maximum violations reached. Your exam has been automatically submitted.' },
} as const;

export function ExamWorkspace(props: WorkspaceProps) {
  const s = useExamSession(props);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmAnswer, setConfirmAnswer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tab, setTab] = useState<'Editor' | 'terminal'>('Editor');
  const [showResultPopup, setShowResultPopup] = useState(false);

  if (s.loading) return <LoadingSpinner className="min-h-[60vh]" label="Loading exam workspace..." />;
  if (s.error) return <div className="mx-auto max-w-lg py-10"><ErrorState message={s.error} onRetry={s.reload} /></div>;
  const { exam, current, settings, navStates, unanswered, runCode, runSamples, submitAnswer, console: consoleState, busy, finishing, submitExam, violations, guard, readOnly, maxViolations, submissionResult: submissionResultFromHook } = s;
  if (!exam || !current || !settings) return s.finishing ? <FinishOverlay finishing={s.finishing} /> : <ErrorState message="This exam has no questions." onRetry={s.reload} />;

  const preview = s.isPreview;
  const locked = s.readOnly;
  const restrict = !preview && (settings.disableCopyPaste || settings.disableRightClick);
  const unansweredMsg = s.unanswered > 0 ? `You have ${s.unanswered} unanswered question${s.unanswered === 1 ? '' : 's'}. ` : '';

  return (
    <div className={clsx('flex min-h-screen flex-col bg-slate-50 lg:h-screen', preview && 'min-h-0 lg:h-[calc(100vh-7.5rem)]')}>
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/85 shadow-soft backdrop-blur-md">
        <div aria-hidden className="h-0.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-accent-500" />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{exam.title}</h1>
            <p className="truncate text-xs text-slate-500">
              {preview ? 'Previewing as administrator' : <>{s.student?.name}{s.student?.studentId && ` (${s.student.studentId})`}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-soft" aria-label={`Question ${s.index + 1} of ${s.questions.length}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-accent-600 text-[10px] font-extrabold text-white">{s.index + 1}</span>
              {s.index + 1} / {s.questions.length}
            </span>
            {preview ? (
              <span role="status" className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800 shadow-soft"><Eye className="h-4 w-4" aria-hidden />Preview - no attempt is created</span>
            ) : <>
              <Timer seconds={s.remaining} />
              <NetworkBadge online={s.online} saveState={s.saveState} />
              {settings.maxViolations > 0 && s.violations > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 shadow-soft">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />Violations {s.violations}/{settings.maxViolations}
                </span>
              )}
              <Button variant="danger" icon={<Send className="h-4 w-4" aria-hidden />} disabled={locked} onClick={() => setConfirmSubmit(true)}>Submit Exam</Button>
            </>}
          </div>
        </div>
      </header>

      <div className="flex-1 gap-4 p-3 sm:p-4 lg:grid lg:min-h-0 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1.2fr)] lg:overflow-hidden">
        <aside className="mb-3 lg:mb-0 lg:overflow-y-auto"><QuestionNavigator states={s.navStates} current={s.index} onSelect={s.goTo} disabled={locked} /></aside>

        <section aria-label="Problem" className="mb-4 flex min-w-0 flex-col gap-3 lg:mb-0 lg:overflow-y-auto dark-scroll lg:pr-1">
          <div key={s.index} className="animate-fade-in">
            <QuestionCard question={current} index={s.index} total={s.questions.length} noSelect={!preview && settings.disableCopyPaste} />
          </div>
          <div className="flex shrink-0 justify-between gap-2">
            <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" aria-hidden />} disabled={s.index === 0 || locked} onClick={() => s.goTo(s.index - 1)}>Previous</Button>
            <Button variant="secondary" disabled={s.index >= s.questions.length - 1 || locked} onClick={() => s.goTo(s.index + 1)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
          </div>
        </section>

        <section aria-label="Solution" className="flex min-w-0 flex-col gap-3 lg:overflow-y-auto dark-scroll lg:pr-1">
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-soft">
            <Button variant={tab === 'Editor' ? 'primary' : 'secondary'} className={tab === 'Editor' ? '' : 'border-transparent bg-transparent text-slate-700 hover:bg-slate-50'} onClick={() => setTab('Editor')}>Editor</Button>
            <Button variant={tab === 'terminal' ? 'primary' : 'secondary'} className={tab === 'terminal' ? '' : 'border-transparent bg-transparent text-slate-700 hover:bg-slate-50'} onClick={() => setTab('terminal')}>Terminal</Button>
            <span className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600" aria-label={`Question ${s.index + 1} of ${s.questions.length}`}>
              Q {s.index + 1}/{s.questions.length}
            </span>
          </div>
          {tab === 'Editor' ? (
            <>
              <div className="h-[46vh] min-h-[340px] shrink-0">
                <CodeEditor language={s.language} value={s.code} onChange={s.setCode} readOnly={locked}
                  restrictClipboard={restrict && settings.disableCopyPaste} blockContextMenu={!preview && settings.disableRightClick}
                  ariaLabel={`Code editor for question ${s.index + 1}`}
                  toolbar={<LanguageSelector languages={current.allowedLanguages} value={s.language} onChange={s.setLanguage} disabled={locked} />} />
              </div>
              <div className="shrink-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-lift">
                <header className="flex items-center justify-between border-b border-slate-700/70 bg-slate-800/60 px-3 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Custom input</span>
                  <span className="font-mono text-[10px] text-slate-500">stdin</span>
                </header>
                <Textarea aria-label="Custom input" value={s.customInput} onChange={(e) => s.setCustomInput(e.target.value)} disabled={locked} rows={3}
                  placeholder="Type input for Run Code (stdin)"
                  className="!min-h-[70px] rounded-none border-0 !border-t !border-slate-800 !bg-slate-950/40 !text-slate-100 placeholder:!text-slate-600 focus:!ring-0 focus:!border-slate-700" />
              </div>
              <div className="flex shrink-0 flex-wrap gap-2" role="group" aria-label="Code actions">
                <Button icon={<Play className="h-4 w-4" aria-hidden />} onClick={() => void s.runCode()} disabled={locked || s.busy}>Run Code</Button>
                <Button variant="secondary" icon={<TestTubes className="h-4 w-4" aria-hidden />} onClick={() => void s.runSamples()} disabled={locked || s.busy}>Run Samples</Button>
                <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={() => setConfirmReset(true)} disabled={locked}>Reset Code</Button>
                {!preview && <>
                  <Button variant="secondary" icon={<Save className="h-4 w-4" aria-hidden />} onClick={() => void s.saveNow()} disabled={locked || s.saveState === 'saving'}>Save Code</Button>
                  <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300" icon={<Send className="h-4 w-4" aria-hidden />} onClick={() => setConfirmAnswer(true)} disabled={locked || s.busy}>Submit Answer</Button>
                </>}
              </div>
            </>
          ) : (
            <div className="flex min-h-[240px] flex-1 shrink-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-lift">
              <OutputConsole state={s.console} />
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog open={confirmReset} title="Reset code" message="Reset the editor to the starter code for this language? Your current code will be replaced." confirmLabel="Reset"
        danger onCancel={() => setConfirmReset(false)} onConfirm={() => { s.resetCode(); setConfirmReset(false); }} />
      <ConfirmDialog open={confirmAnswer} title="Submit answer" message="Are you sure you want to submit this answer?" confirmLabel="Submit Answer"
        onCancel={() => setConfirmAnswer(false)} onConfirm={() => { setConfirmAnswer(false); void s.submitAnswer(); }} />
      <ConfirmDialog open={confirmSubmit} title="Submit exam" danger
        message={`${unansweredMsg}Are you sure you want to submit the exam?`} confirmLabel="Submit Exam" cancelLabel="Cancel"
        onCancel={() => setConfirmSubmit(false)} onConfirm={() => { setConfirmSubmit(false); void s.submitExam(); }} />

      {showResultPopup && submissionResultFromHook && (
    <Modal open={showResultPopup} onClose={() => setShowResultPopup(false)} title={`Question ${s.index + 1} Results`}>
      <div className="p-4 space-y-2 text-sm">
        <p className="font-medium text-slate-700 {submissionResultFromHook.verdict === 'ACCEPTED' ? 'text-emerald-600' : 'text-red-600'}">
          Answer submitted - {submissionResultFromHook.verdict === 'ACCEPTED' ? 'Accepted' : 'Wrong Answer'}
        </p>
        <p className="text-slate-500">Test cases passed: {submissionResultFromHook.passedTestCases !== undefined ? `${submissionResultFromHook.passedTestCases} / ${submissionResultFromHook.totalTestCases}` : 'N/A'}</p>
        <p className="text-slate-500">Marks: {submissionResultFromHook.obtainedMarks !== undefined ? `${submissionResultFromHook.obtainedMarks} / ${submissionResultFromHook.maxMarks || current?.marks || 100}` : 'N/A'}</p>
        <p className="text-slate-500">Execution time: {submissionResultFromHook.executionTimeMs !== undefined ? `${submissionResultFromHook.executionTimeMs} ms` : 'N/A'}</p>
      </div>
      <div className="p-4 bg-slate-950 rounded-lg text-xs">
        <p className="font-medium text-slate-400">Status:</p>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            <Maximize className="h-2 w-2" aria-hidden />
            Not Attempted {s.navStates.filter((s) => s === 'NOT_ATTEMPTED').length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            <CheckCircle2 className="h-2 w-2" aria-hidden />
            Attempted {s.navStates.filter((s) => s === 'ATTEMPTED').length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            <Loader2 className="h-2 w-2 animate-spin" aria-hidden />
            Running {s.navStates.filter((s) => s === 'RUNNING').length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            <CheckSquare2 className="h-2 w-2" aria-hidden />
            Submitted {s.navStates.filter((s) => s === 'SUBMITTED').length}
          </span>
        </div>
      </div>
    </Modal>
  )}

      {s.guard.needsFullscreen && !s.finishing && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="fs-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-scale-in space-y-4 p-6 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 shadow-glow">
              <Maximize className="h-8 w-8 text-white" aria-hidden />
            </span>
            <h2 id="fs-title">Fullscreen is required</h2>
            <p className="text-sm text-slate-600">This exam must be taken in fullscreen mode. Leaving fullscreen is recorded as a violation. The timer keeps running.</p>
            <Button onClick={s.guard.requestFullscreen} icon={<Maximize className="h-4 w-4" aria-hidden />} autoFocus className="w-full">Enter fullscreen</Button>
          </div>
        </div>
      )}
      {s.finishing && <FinishOverlay finishing={s.finishing} />}
    </div>
  );
  useEffect(() => {
    if (submissionResultFromHook) setShowResultPopup(true);
  }, [submissionResultFromHook]);
}

function FinishOverlay({ finishing }: { finishing: NonNullable<ReturnType<typeof useExamSession>['finishing']> }) {
  const copy = FINISH_COPY[finishing.reason];
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="finish-title" aria-describedby="finish-desc"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md animate-scale-in space-y-3 p-8 text-center">
        {finishing.done
          ? <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow"><Send className="h-8 w-8 text-white" aria-hidden /></span>
          : <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 shadow-glow"><Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden /></span>}
        <h2 id="finish-title">{finishing.done ? copy.done : copy.title}</h2>
        <p id="finish-desc" className="text-sm text-slate-600" role="status">
          {finishing.done ? 'Taking you to your result...'
            : finishing.waiting ? <span className="inline-flex items-center gap-1 text-amber-800"><AlertTriangle className="h-4 w-4" aria-hidden />Waiting for the connection - your code is saved and will be submitted automatically.</span>
            : finishing.reason === 'manual' ? 'Please do not close this page.' : 'Your answers are being saved and evaluated. Please do not close this page.'}
        </p>
      </div>
    </div>
  );
}

export default ExamWorkspace;