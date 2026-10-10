import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExamSettings, ViolationType } from '../../types';

interface Options {
  /** only true for a live attempt (never preview) */
  enabled: boolean;
  settings: ExamSettings | undefined;
  /** stop guarding (exam is being finished) */
  suspended: boolean;
  report: (type: ViolationType, details?: string) => void;
}

const isFs = () => !!document.fullscreenElement;
export const exitFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };

/** Browser-level anti-cheating: fullscreen gate, clipboard / context-menu blocking, tab-switch detection, unload warning. */
export function useExamGuard({ enabled, settings, suspended, report }: Options) {
  const [fullscreen, setFullscreen] = useState(isFs());
  const reportRef = useRef(report);
  reportRef.current = report;
  const active = enabled && !suspended && !!settings;
  const lastReport = useRef<Record<string, number>>({});
  const emit = useCallback((type: ViolationType, details?: string, minGapMs = 800) => {
    const now = Date.now();
    if (now - (lastReport.current[type] ?? 0) < minGapMs) return;
    lastReport.current[type] = now;
    reportRef.current(type, details);
  }, []);

  // fullscreen gate + exit detection
  const wasFs = useRef(isFs());
  useEffect(() => {
    const onChange = () => {
      const now = isFs();
      setFullscreen(now);
      if (!now && wasFs.current && active && settings?.fullscreenRequired) emit('FULLSCREEN_EXIT', 'Left fullscreen mode', 0);
      wasFs.current = now;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [active, settings?.fullscreenRequired, emit]);

  // clipboard + context menu
  useEffect(() => {
    if (!active || !settings) return;
    const cleanups: Array<() => void> = [];
    const on = <K extends keyof DocumentEventMap>(t: K, h: (e: DocumentEventMap[K]) => void) => {
      document.addEventListener(t, h, true); cleanups.push(() => document.removeEventListener(t, h, true));
    };
    if (settings.disableCopyPaste) {
      const block = (type: ViolationType, label: string) => (e: Event) => { e.preventDefault(); e.stopPropagation(); emit(type, `${label} blocked`); };
      on('copy', block('COPY_ATTEMPT', 'Copy')); on('cut', block('CUT_ATTEMPT', 'Cut')); on('paste', block('PASTE_ATTEMPT', 'Paste'));
      on('drop', (e) => { e.preventDefault(); e.stopPropagation(); emit('PASTE_ATTEMPT', 'Drop blocked'); });
      on('keydown', (e) => {
        const k = e.key.toLowerCase(); const mod = e.ctrlKey || e.metaKey;
        let type: ViolationType | null = null;
        if (mod && k === 'v') type = 'PASTE_ATTEMPT'; else if (e.shiftKey && k === 'insert') type = 'PASTE_ATTEMPT';
        else if (mod && k === 'x') type = 'CUT_ATTEMPT'; else if (mod && (k === 'c' || k === 'insert')) type = 'COPY_ATTEMPT';
        if (type) { e.preventDefault(); e.stopPropagation(); emit(type, 'Keyboard shortcut blocked'); }
      });
    }
    if (settings.disableRightClick) {
      on('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); emit('RIGHT_CLICK', 'Context menu blocked'); });
    }
    return () => cleanups.forEach((c) => c());
  }, [active, settings, emit]);

  // tab switch / window blur (never double counted)
  useEffect(() => {
    if (!active || !settings?.tabSwitchDetection) return;
    let away = false; let blurTimer: ReturnType<typeof setTimeout> | undefined;
    const back = () => { if (document.visibilityState === 'visible' && document.hasFocus()) away = false; };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { if (!away) { away = true; emit('TAB_SWITCH', 'Page hidden', 0); } } else back();
    };
    const onBlur = () => {
      clearTimeout(blurTimer);
      // wait a beat: a tab switch fires blur first, then visibilitychange
      blurTimer = setTimeout(() => {
        if (!away && document.visibilityState === 'visible' && !document.hasFocus()) { away = true; emit('WINDOW_BLUR', 'Window lost focus', 0); }
      }, 200);
    };
    const onFocus = () => { clearTimeout(blurTimer); away = false; };
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus);
    return () => { clearTimeout(blurTimer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, [active, settings?.tabSwitchDetection, emit]);

  // leaving the page while in progress
  useEffect(() => {
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [active]);

  const requestFullscreen = useCallback(() => { void document.documentElement.requestFullscreen?.().catch(() => undefined); }, []);
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const needsFullscreen = active && supported && !!settings?.fullscreenRequired && !fullscreen;
  return { needsFullscreen, requestFullscreen };
}
