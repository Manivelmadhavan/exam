import { ReactNode, useCallback, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { AlignLeft, Braces, ZoomIn, ZoomOut } from 'lucide-react';
import type { Language } from '../types';
import { monacoLanguage } from '../utils/format';

type MonacoEditor = Parameters<OnMount>[0];

interface Props {
  language: Language; value: string; onChange: (code: string) => void; readOnly?: boolean;
  /** disables paste/copy/cut, drag-drop and the context menu inside the editor */
  restrictClipboard?: boolean; blockContextMenu?: boolean;
  /** rendered on the left of the toolbar (e.g. the language selector) */
  toolbar?: ReactNode; ariaLabel?: string;
}

export function CodeEditor({ language, value, onChange, readOnly, restrictClipboard, blockContextMenu, toolbar, ariaLabel = 'Code editor' }: Props) {
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef<MonacoEditor | null>(null);

  const onMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    if (restrictClipboard) {
      // Stop Monaco's own keybindings for clipboard actions (the page-level guard reports the attempt).
      const noop = () => undefined;
      const { KeyMod, KeyCode } = monaco;
      editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyV, noop);
      editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyC, noop);
      editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyX, noop);
      editor.addCommand(KeyMod.Shift | KeyCode.Insert, noop);
    }
  }, [restrictClipboard]);

  const format = () => {
    const ed = editorRef.current;
    if (!ed || readOnly) return;
    const before = ed.getValue();
    const action = ed.getAction('editor.action.formatDocument');
    const done = action ? Promise.resolve(action.run()).catch(() => undefined) : Promise.resolve();
    // Monaco ships formatters only for a few languages: fall back to tidying trailing whitespace.
    void done.then(() => {
      if (ed.getValue() === before) {
        const tidy = before.replace(/[ \t]+$/gm, '');
        if (tidy !== before) onChange(tidy);
      }
    });
  };

  const btn = 'inline-flex items-center gap-1 rounded-lg border border-slate-600/80 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 shadow-soft transition-colors hover:border-brand-500/60 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 bg-gradient-to-r from-slate-800 to-slate-800/60 px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">{toolbar}</div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Editor tools">
          <button type="button" className={btn} onClick={() => setFontSize((s) => Math.max(10, s - 1))} aria-label="Decrease font size"><ZoomOut className="h-3.5 w-3.5" aria-hidden />A-</button>
          <span className="w-9 text-center text-xs font-medium text-slate-300" aria-live="polite">{fontSize}px</span>
          <button type="button" className={btn} onClick={() => setFontSize((s) => Math.min(28, s + 1))} aria-label="Increase font size"><ZoomIn className="h-3.5 w-3.5" aria-hidden />A+</button>
          <button type="button" className={btn} onClick={format} disabled={readOnly}><AlignLeft className="h-3.5 w-3.5" aria-hidden />Format</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-stretch">
        <div className="flex flex-col items-center gap-1 border-r border-slate-800 bg-slate-900 py-2 px-1.5" aria-hidden>
          <Braces className="h-4 w-4 text-brand-400" />
          <span className="rotate-180 text-[9px] font-bold tracking-[0.15em] text-slate-600 [writing-mode:vertical-rl]">{monacoLanguage(language).toUpperCase()}</span>
        </div>
        <div className="min-h-0 flex-1" aria-label={ariaLabel}>
          <Editor
            height="100%" theme="vs-dark" language={monacoLanguage(language)} path={`solution.${language.toLowerCase()}`}
            value={value} onChange={(v) => onChange(v ?? '')} onMount={onMount}
            loading={<span className="text-sm text-slate-300">Loading editor...</span>}
            options={{
              readOnly, fontSize, lineNumbers: 'on', automaticLayout: true, minimap: { enabled: false }, scrollBeyondLastLine: false,
              tabSize: 4, wordWrap: 'on', fontFamily: "'JetBrains Mono', Consolas, Menlo, monospace", padding: { top: 8, bottom: 8 },
              contextmenu: !(restrictClipboard || blockContextMenu), dragAndDrop: !restrictClipboard, dropIntoEditor: { enabled: !restrictClipboard },
              accessibilitySupport: 'auto', ariaLabel,
            }}
          />
        </div>
      </div>
    </div>
  );
}
export default CodeEditor;