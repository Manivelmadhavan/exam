import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, errorMessage, isNetworkError } from '../../services/api';
import { adminApi, attemptsApi, examsApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { AttemptView, ExamQuestionView, ExamSettings, ExamSummary, Language, PreviewView, RunSamplesResult, ViolationType } from '../../types';
import { STARTER_CODE } from '../../utils/starter';
import { clearAttemptCache, dirtyEntries, markClean, readCache, writeCache } from '../../utils/offlineCache';
import { verdictLabel } from '../../utils/format';
import type { ConsoleState } from '../../components/OutputConsole';
import type { NavState } from '../../components/QuestionNavigator';
import { clockOffset, remainingSeconds } from './timer';
import { exitFullscreen, useExamGuard } from './useExamGuard';
import { Modal } from '../../components/ui/Modal';

export type WorkspaceProps = { mode: 'preview'; examId: string } | { mode: 'attempt'; attemptId: string };
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type FinishReason = 'manual' | 'auto' | 'closed' | 'violation';
export interface FinishState { reason: FinishReason; done: boolean; waiting: boolean }

interface Draft { language: Language; codes: Partial<Record<Language, string>> }
type Drafts = Record<string, Draft>;

const AUTOSAVE_DEBOUNCE_MS = 3000;
const AUTOSAVE_INTERVAL_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const codeErrorCode = (e: unknown) => (e instanceof ApiError ? e.errorCode : '');
const isClosedError = (e: unknown) => ['EXAM_EXPIRED', 'ATTEMPT_CLOSED'].includes(codeErrorCode(e));
const VIOLATION_LABEL: Record<ViolationType, string> = {
  TAB_SWITCH: 'Tab switch', WINDOW_BLUR: 'Window left', FULLSCREEN_EXIT: 'Fullscreen exit', COPY_ATTEMPT: 'Copy attempt',
  PASTE_ATTEMPT: 'Paste attempt', CUT_ATTEMPT: 'Cut attempt', RIGHT_CLICK: 'Right click', PAGE_LEAVE: 'Page leave',
};

function buildDraft(q: ExamQuestionView, attemptId: string | null): { draft: Draft; dirty: boolean } {
  const allowed = q.allowedLanguages;
  let language: Language = allowed[0] ?? 'PYTHON';
  const codes: Partial<Record<Language, string>> = {};
  const sub = q.submission;
  if (sub && allowed.includes(sub.language)) { language = sub.language; if (sub.sourceCode) codes[sub.language] = sub.sourceCode; }
  const cached = attemptId ? readCache(attemptId, q.id) : null;
  let dirty = false;
  if (cached?.dirty && allowed.includes(cached.language)) { language = cached.language; codes[cached.language] = cached.sourceCode; dirty = true; }
  return { draft: { language, codes }, dirty };
}
const codeOf = (d: Draft | undefined, fallback: Language = 'PYTHON') => d ? (d.codes[d.language] ?? STARTER_CODE[d.language]) : STARTER_CODE[fallback];

export function useExamSession(props: WorkspaceProps) {
  const isPreview = props.mode === 'preview';
  const attemptId = props.mode === 'attempt' ? props.attemptId : null;
  const examId = props.mode === 'preview' ? props.examId : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const online = useNetworkStatus();
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const loaded = useAsync<AttemptView | PreviewView>(
    () => (attemptId ? attemptsApi.get(attemptId) : examsApi.preview(examId as string)),
    [attemptId, examId],
  );
  const data = loaded.data;
  const view = useMemo(() => {
    if (!data) return null;
    const exam: ExamSummary = data.exam;
    const att = 'attempt' in data ? data : null;
    return {
      exam, questions: data.questions, settings: exam.settings as ExamSettings,
      student: att?.student ?? null, attempt: att?.attempt ?? null, serverTime: att?.serverTime ?? null,
    };
  }, [data]);

  /* ---------- mutable state mirrored in refs so timers never see stale values ---------- */
  const draftsRef = useRef<Drafts>({});
  const dirtyRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const expiresAtRef = useRef<string | null>(null);
  const finishingRef = useRef(false);
  const stopSavingRef = useRef(false);
  const inflightRef = useRef<Promise<boolean> | null>(null);
  const retryAtRef = useRef(0);
  const failuresRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const initedRef = useRef(false);

  const [index, setIndexState] = useState(0);
  const [ready, setReady] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [consoles, setConsoles] = useState<Record<string, ConsoleState>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [busyQid, setBusyQid] = useState<string | null>(null); // run / submit in flight
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState<FinishState | null>(null);
  const [violations, setViolations] = useState(0);

  const questions = view?.questions ?? [];
  const current = questions[index];
  const settings = view?.settings;

  const setConsole = useCallback((qid: string, c: ConsoleState) => setConsoles((m) => ({ ...m, [qid]: c })), []);

  /* ---------- saving ---------- */
  const scheduleRetry = useCallback((fn: () => void) => {
    failuresRef.current += 1;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(failuresRef.current, 5));
    retryAtRef.current = Date.now() + delay;
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(fn, delay);
  }, []);

  const finishRef = useRef<(reason: FinishReason, resultId?: string | null) => Promise<void>>(async () => undefined);

  const flush = useCallback(async (manual = false): Promise<boolean> => {
    if (!attemptId || stopSavingRef.current) return true;
    if (inflightRef.current) await inflightRef.current.catch(() => false);
    if (dirtyRef.current.size === 0) return true;
    if (!manual && Date.now() < retryAtRef.current) return false;
    const run = (async () => {
      const sent = [...dirtyRef.current].map((qid) => ({ qid, d: draftsRef.current[qid] })).filter((x) => x.d);
      const items = sent.map(({ qid, d }) => ({ questionId: qid, language: d.language, sourceCode: codeOf(d) }));
      if (items.length === 0) { dirtyRef.current.clear(); return true; }
      setSaveState('saving');
      try {
        const res = await attemptsApi.saveCode(attemptId, items);
        for (const it of items) {
          // only mark clean if the student did not type more while the request was in flight
          if (codeOf(draftsRef.current[it.questionId]) === it.sourceCode && draftsRef.current[it.questionId].language === it.language) {
            dirtyRef.current.delete(it.questionId); markClean(attemptId, it.questionId);
          }
        }
        failuresRef.current = 0; retryAtRef.current = 0;
        if (res.remainingSeconds != null && expiresAtRef.current) offsetRef.current = Date.parse(expiresAtRef.current) - res.remainingSeconds * 1000 - Date.now();
        setSaveState('saved');
        if (dirtyRef.current.size > 0) scheduleRetry(() => void flush());
        return true;
      } catch (e) {
        if (isClosedError(e)) { stopSavingRef.current = true; setSaveState('error'); void finishRef.current('closed'); return false; }
        setSaveState('error');
        if (isNetworkError(e) || !(e instanceof ApiError) || e.status >= 500) scheduleRetry(() => void flush());
        else if (e instanceof ApiError) toast(`Could not save your code: ${e.message}`, 'error');
        return false;
      }
    })();
    inflightRef.current = run;
    try { return await run; } finally { if (inflightRef.current === run) inflightRef.current = null; }
  }, [attemptId, scheduleRetry, toast]);

  const touch = useCallback((qid: string) => {
    if (!attemptId) return;
    const d = draftsRef.current[qid];
    dirtyRef.current.add(qid);
    writeCache(attemptId, qid, { language: d.language, sourceCode: codeOf(d), dirty: true, updatedAt: Date.now() });
    setSaveState((s) => (s === 'saving' ? s : 'idle'));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
  }, [attemptId, flush]);

  const setCode = useCallback((code: string) => {
    if (!current || finishingRef.current) return;
    const d = draftsRef.current[current.id];
    if (!d || codeOf(d) === code) return;
    draftsRef.current = { ...draftsRef.current, [current.id]: { ...d, codes: { ...d.codes, [d.language]: code } } };
    rerender(); touch(current.id);
  }, [current, touch]);

  const setLanguage = useCallback((language: Language) => {
    if (!current || finishingRef.current) return;
    const d = draftsRef.current[current.id];
    if (!d || d.language === language || !current.allowedLanguages.includes(language)) return;
    draftsRef.current = { ...draftsRef.current, [current.id]: { ...d, language } };
    rerender(); touch(current.id);
  }, [current, touch]);

  const resetCode = useCallback(() => {
    if (!current) return;
    const d = draftsRef.current[current.id];
    if (!d) return;
    setCode(STARTER_CODE[d.language]);
  }, [current, setCode]);

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= questions.length || i === index) return;
    void flush(); setIndexState(i);
  }, [flush, index, questions.length]);

  /* ---------- finishing ---------- */
  const finish = useCallback(async (reason: FinishReason, knownResultId?: string | null) => {
    if (!attemptId || finishingRef.current) return;
    finishingRef.current = true;
    clearTimeout(debounceRef.current); clearTimeout(retryTimerRef.current);
    setFinishing({ reason, done: false, waiting: false });
    let resultId = knownResultId ?? null;
    try {
      if (!resultId) {
        if (reason !== 'closed') { stopSavingRef.current = false; await flush(true).catch(() => false); }
        for (let attempt = 1; ; attempt++) {
          try { resultId = (await attemptsApi.submitExam(attemptId)).resultId; break; }
          catch (e) {
            const retryable = isNetworkError(e) || (e instanceof ApiError && e.status >= 500 && e.errorCode !== 'EVALUATION_PENDING');
            if (!retryable || (reason === 'manual' && attempt >= 3)) throw e;
            setFinishing({ reason, done: false, waiting: true });
            await sleep(Math.min(10_000, 1500 * attempt));
          }
        }
      }
      stopSavingRef.current = true;
      clearAttemptCache(attemptId);
      exitFullscreen();
      setFinishing({ reason, done: true, waiting: false });
      if (reason !== 'manual') await sleep(2500);
      navigate(`/student/results/${resultId}`, { replace: true });
    } catch (e) {
      finishingRef.current = false; setFinishing(null);
      if (codeErrorCode(e) === 'EVALUATION_PENDING') {
        exitFullscreen(); toast(errorMessage(e), 'info'); navigate('/student/results', { replace: true });
      } else toast(`Could not submit the exam: ${errorMessage(e)} Your code is saved - please try again.`, 'error');
    }
  }, [attemptId, flush, navigate, toast]);
  finishRef.current = finish;

  /* ---------- violations ---------- */
  const report = useCallback((type: ViolationType, details?: string) => {
    if (!attemptId || finishingRef.current) return;
    attemptsApi.violation(attemptId, type, details).then((res) => {
      setViolations(res.count);
      toast(`Warning: ${VIOLATION_LABEL[type]} recorded (${res.count}${res.max > 0 ? `/${res.max}` : ''}).`, 'error');
      if (res.autoSubmitted) void finishRef.current('violation', res.resultId ?? null);
    }).catch(() => undefined);
  }, [attemptId, toast]);
  const guard = useExamGuard({ enabled: !!attemptId && ready, settings, suspended: !!finishing, report });

  /* ---------- initialisation (once data arrives) ---------- */
  useEffect(() => {
    if (!view || initedRef.current) return;
    initedRef.current = true;
    const drafts: Drafts = {};
    for (const q of view.questions) {
      const { draft, dirty } = buildDraft(q, attemptId);
      drafts[q.id] = draft; if (dirty) dirtyRef.current.add(q.id);
    }
    draftsRef.current = drafts;
    setSubmitted(new Set(view.questions.filter((q) => q.submission?.state === 'SUBMITTED').map((q) => q.id)));
    if (view.attempt && view.serverTime) {
      offsetRef.current = clockOffset(view.serverTime);
      expiresAtRef.current = view.attempt.expiresAt;
      setRemaining(remainingSeconds(view.attempt.expiresAt, offsetRef.current));
      if (view.attempt.status !== 'IN_PROGRESS') {
        // already finished: go straight to the result (submitExam waits for evaluation if there is none yet)
        if (view.attempt.resultId) { clearAttemptCache(view.attempt.id); navigate(`/student/results/${view.attempt.resultId}`, { replace: true }); return; }
        void finish('closed'); return;
      }
    }
    setReady(true);
    rerender();
  }, [view, attemptId, finish, navigate]);

  /* ---------- countdown ---------- */
  useEffect(() => {
    if (!ready || !attemptId) return;
    const tick = () => {
      const left = remainingSeconds(expiresAtRef.current ?? '', offsetRef.current);
      setRemaining((p) => (p === left ? p : left));
      if (left <= 0 && !finishingRef.current) void finishRef.current('auto');
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [ready, attemptId]);

  /* ---------- periodic / event-driven autosave ---------- */
  useEffect(() => {
    if (!ready || !attemptId) return;
    const t = setInterval(() => { if (dirtyRef.current.size) void flush(); }, AUTOSAVE_INTERVAL_MS);
    const onBlur = () => { if (dirtyRef.current.size) void flush(true); };
    const onOnline = () => { retryAtRef.current = 0; if (dirtyEntries(attemptId).length || dirtyRef.current.size) void flush(true); };
    window.addEventListener('blur', onBlur); window.addEventListener('online', onOnline);
    return () => { clearInterval(t); window.removeEventListener('blur', onBlur); window.removeEventListener('online', onOnline); };
  }, [ready, attemptId, flush]);
  useEffect(() => () => { clearTimeout(debounceRef.current); clearTimeout(retryTimerRef.current); }, []);

  /* ---------- running code ---------- */
  const runFailure = useCallback((qid: string, e: unknown) => {
    if (isClosedError(e)) { void finishRef.current('closed'); return; }
    const hint = codeErrorCode(e) === 'RUNNER_UNAVAILABLE' ? ' The code runner is temporarily unavailable.' : isNetworkError(e) ? ' Check your connection.' : e instanceof ApiError ? ` ${e.message}` : '';
    setConsole(qid, { kind: 'error', message: `Unable to run code.${hint} Please try again.` });
  }, [setConsole]);

  const runCode = useCallback(async () => {
    if (!current || busyQid || finishingRef.current) return;
    const d = draftsRef.current[current.id]; const qid = current.id; const input = customInputs[qid] ?? '';
    setBusyQid(qid); setConsole(qid, { kind: 'running', label: 'Running your code...' });
    try {
      if (attemptId) {
        const res = await attemptsApi.run(attemptId, { questionId: qid, language: d.language, sourceCode: codeOf(d), input, mode: 'custom' });
        if (res.mode === 'custom') setConsole(qid, { kind: 'custom', result: res });
      } else {
        const r = await adminApi.run({ language: d.language, sourceCode: codeOf(d), input, timeLimitMs: current.timeLimitMs, memoryLimitMb: current.memoryLimitMb });
        setConsole(qid, { kind: 'custom', result: { mode: 'custom', status: r.status as 'SUCCESS', output: r.output, errorMessage: r.errorMessage, compilerMessage: r.compilerMessage, executionTimeMs: r.executionTimeMs } });
      }
    } catch (e) { runFailure(qid, e); } finally { setBusyQid(null); }
  }, [current, busyQid, customInputs, attemptId, setConsole, runFailure]);

  const runSamples = useCallback(async () => {
    if (!current || busyQid || finishingRef.current) return;
    const d = draftsRef.current[current.id]; const qid = current.id;
    setBusyQid(qid); setConsole(qid, { kind: 'running', label: 'Running sample tests...' });
    try {
      if (attemptId) {
        const res = await attemptsApi.run(attemptId, { questionId: qid, language: d.language, sourceCode: codeOf(d), mode: 'samples' });
        if (res.mode === 'samples') setConsole(qid, { kind: 'samples', results: res.results });
      } else {
        const samples = current.sampleTests.length ? current.sampleTests : [{ id: 's', input: current.sampleInput, expectedOutput: current.sampleOutput }];
        const results: RunSamplesResult['results'] = [];
        for (const s of samples) {
          const r = await adminApi.run({ language: d.language, sourceCode: codeOf(d), input: s.input, timeLimitMs: current.timeLimitMs, memoryLimitMb: current.memoryLimitMb });
          results.push({ input: s.input, expectedOutput: s.expectedOutput, output: r.output, status: r.status, executionTimeMs: r.executionTimeMs,
            passed: r.status === 'SUCCESS' && r.output.trim() === s.expectedOutput.trim(), errorMessage: r.errorMessage, compilerMessage: r.compilerMessage });
        }
        setConsole(qid, { kind: 'samples', results });
      }
    } catch (e) { runFailure(qid, e); } finally { setBusyQid(null); }
  }, [current, busyQid, attemptId, setConsole, runFailure]);

const [submissionResult, setSubmissionResult] = useState<{ passedTestCases?: number; totalTestCases?: number; obtainedMarks?: number; maxMarks?: number; verdict?: string; executionTimeMs?: number } | null>(null);

  const submitAnswer = useCallback(async () => {
    if (!attemptId || !current || busyQid || finishingRef.current) return;
    const qid = current.id; const d = draftsRef.current[qid];
    setBusyQid(qid); setConsole(qid, { kind: 'running', label: 'Submitting your answer...' });
    try {
      await flush(true);
      const res = await attemptsApi.submitQuestion(attemptId, qid, d.language, codeOf(d));
      setSubmitted((s) => new Set(s).add(qid));
      if (res.verdict) {
        setSubmissionResult({
          passedTestCases: res.passedTestCases,
          totalTestCases: res.totalTestCases,
          obtainedMarks: res.obtainedMarks,
          maxMarks: res.maxMarks,
          verdict: res.verdict,
          executionTimeMs: res.executionTimeMs ?? undefined,
        });
        setConsole(qid, { kind: 'submitted', message: `Answer submitted - ${verdictLabel(res.verdict)}`, tone: res.verdict === 'ACCEPTED' ? 'success' : 'error', details: [
          res.passedTestCases != null && res.totalTestCases != null ? `Test cases passed: ${res.passedTestCases} / ${res.totalTestCases}` : '',
          res.obtainedMarks != null && res.maxMarks != null ? `Marks: ${res.obtainedMarks} / ${res.maxMarks}` : '',
          res.executionTimeMs != null ? `Execution time: ${res.executionTimeMs} ms` : '',
        ].filter(Boolean) });
      } else setConsole(qid, { kind: 'submitted', message: 'Answer submitted', tone: 'success', details: ['You can edit and submit again before the exam ends.'] });
    } catch (e) {
      if (isClosedError(e)) { void finishRef.current('closed'); return; }
      const msg = e instanceof ApiError ? e.message : 'Unable to submit your answer.';
      setConsole(qid, { kind: 'error', message: `${msg}${isNetworkError(e) ? ' Your code is saved locally; please try again.' : ''}` });
    } finally { setBusyQid(null); }
  }, [attemptId, current, busyQid, flush, setConsole]);

  /* ---------- derived ---------- */
  const navStates: NavState[] = questions.map((q) => {
    if (busyQid === q.id) return 'RUNNING';
    if (submitted.has(q.id)) return 'SUBMITTED';
    const c = codeOf(draftsRef.current[q.id], q.allowedLanguages[0]).trim();
    const d = draftsRef.current[q.id];
    return q.submission?.state === 'ATTEMPTED' || (c && d && c !== STARTER_CODE[d.language].trim()) ? 'ATTEMPTED' : 'NOT_ATTEMPTED';
  });
  const unanswered = navStates.filter((s) => s === 'NOT_ATTEMPTED').length;
  const draft = current ? draftsRef.current[current.id] : undefined;

  return {
    isPreview, loading: loaded.loading || (!!view && !ready && !finishing), error: loaded.error, reload: loaded.reload,
    exam: view?.exam, settings, questions, current, index, goTo,
    student: view?.student ?? (user ? { studentId: user.studentId ?? '', name: user.name } : null),
    language: draft?.language ?? current?.allowedLanguages[0] ?? 'PYTHON', code: codeOf(draft), setCode, setLanguage, resetCode,
    remaining, saveState, online, saveNow: () => flush(true), customInput: current ? customInputs[current.id] ?? '' : '',
    setCustomInput: (v: string) => current && setCustomInputs((m) => ({ ...m, [current.id]: v })),
    console: current ? consoles[current.id] ?? ({ kind: 'idle' } as ConsoleState) : ({ kind: 'idle' } as ConsoleState),
    busy: busyQid !== null, runCode, runSamples, submitAnswer, navStates, unanswered,
    finishing, submitExam: () => finish('manual'), violations, guard, readOnly: !!finishing || !ready,
    maxViolations: settings?.maxViolations ?? 0,
    submissionResult,
  };
}
