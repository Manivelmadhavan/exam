import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../services/api';
import { questionsApi } from '../services/endpoints';
import type { TestCase } from '../types';
import { Badge, Checkbox, EmptyState } from './ui';
import { Button } from './AdminBits';

interface Props {
  value: TestCase[];
  onChange: (v: TestCase[]) => void;
  /** When set, every add / edit / delete is saved to the server immediately. */
  questionId?: string;
}

type Draft = TestCase & { key: string };
const newDraft = (isSample: boolean): Draft => ({ key: Math.random().toString(36).slice(2), input: '', expectedOutput: '', isSample, weight: 1 });
const payload = (t: TestCase) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample, weight: t.weight });

function Row({ index, tc, dirty, busy, persisted, onEdit, onSave, onDelete }: {
  index: number; tc: TestCase; dirty: boolean; busy: boolean; persisted: boolean;
  onEdit: (patch: Partial<TestCase>) => void; onSave: () => void; onDelete: () => void;
}) {
  const n = index + 1;
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          Test case {n} {tc.isSample ? <Badge tone="blue">Sample (visible)</Badge> : <Badge>Hidden</Badge>}
          {persisted && !tc.id && <Badge tone="amber">Unsaved</Badge>}
        </span>
        <div className="flex items-center gap-4">
          <Checkbox label="Sample" checked={tc.isSample} onChange={(e) => onEdit({ isSample: e.target.checked })} />
          <label className="flex items-center gap-1 text-sm text-slate-600">Weight
            <input type="number" min={1} max={1000} aria-label={`Weight of test case ${n}`} value={tc.weight}
              onChange={(e) => onEdit({ weight: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} className="input w-20 py-1" />
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">Input
          <textarea rows={3} value={tc.input} onChange={(e) => onEdit({ input: e.target.value })} className="input mt-1 font-mono" spellCheck={false} />
        </label>
        <label className="block text-xs font-medium text-slate-600">Expected output
          <textarea rows={3} value={tc.expectedOutput} onChange={(e) => onEdit({ expectedOutput: e.target.value })} className="input mt-1 font-mono" spellCheck={false} />
        </label>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        {persisted && (dirty || !tc.id) && <Button size="sm" icon={<Save className="h-4 w-4" />} loading={busy} onClick={onSave} disabled={!tc.expectedOutput.length}>Save</Button>}
        <Button size="sm" variant="ghost" loading={busy && !dirty} aria-label={`Delete test case ${n}`} onClick={onDelete}><Trash2 className="h-4 w-4 text-red-500" aria-hidden /> Delete</Button>
      </div>
    </li>
  );
}

export function TestcaseEditor({ value, onChange, questionId }: Props) {
  const { toast } = useToast();
  const persisted = !!questionId;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [edits, setEdits] = useState<Record<string, TestCase>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const refresh = async () => { if (questionId) onChange(await questionsApi.listTests(questionId)); };
  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusyKey(key);
    try { await fn(); toast(ok, 'success'); } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusyKey(null); }
  };

  const items: Array<{ tc: TestCase; key: string; draft?: Draft }> = [
    ...value.map((tc, i) => ({ tc: (tc.id && edits[tc.id]) || tc, key: tc.id ?? `local-${i}` })),
    ...drafts.map((d) => ({ tc: d, key: d.key, draft: d })),
  ];

  const add = () => {
    const sample = items.length < 1;
    if (persisted) setDrafts((d) => [...d, newDraft(sample)]);
    else onChange([...value, { input: '', expectedOutput: '', isSample: sample, weight: 1 }]);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && <EmptyState title="No test cases yet" description="Add at least one test case. Mark some as Sample so students can see them; the rest stay hidden." />}
      <ol className="space-y-3">
        {items.map(({ tc, key, draft }, i) => {
          const orig = tc.id ? value.find((v) => v.id === tc.id) : undefined;
          const dirty = !!orig && JSON.stringify(payload(orig)) !== JSON.stringify(payload(tc));
          return (
            <Row key={key} index={i} tc={tc} dirty={dirty} busy={busyKey === key} persisted={persisted}
              onEdit={(patch) => {
                if (draft) setDrafts((ds) => ds.map((d) => (d.key === draft.key ? { ...d, ...patch } : d)));
                else if (persisted && tc.id) setEdits((e) => ({ ...e, [tc.id!]: { ...tc, ...patch } }));
                else onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
              }}
              onSave={() => void run(key, async () => {
                if (draft) { await questionsApi.addTest(questionId!, payload(draft)); setDrafts((ds) => ds.filter((d) => d.key !== draft.key)); }
                else { await questionsApi.updateTest(tc.id!, payload(tc)); setEdits((e) => { const { [tc.id!]: _gone, ...rest } = e; return rest; }); }
                await refresh();
              }, 'Test case saved')}
              onDelete={() => {
                if (draft) { setDrafts((ds) => ds.filter((d) => d.key !== draft.key)); return; }
                if (!persisted || !tc.id) { onChange(value.filter((_, j) => j !== i)); return; }
                void run(key, async () => { await questionsApi.removeTest(tc.id!); await refresh(); }, 'Test case deleted');
              }} />
          );
        })}
      </ol>
      <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={add}>Add test case</Button>
    </div>
  );
}
