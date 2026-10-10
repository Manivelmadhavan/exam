import { RotateCcw, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button } from '../../components/AdminBits';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, FilterBar, LoadingSpinner, PageHeader, Pagination, SearchBar, Select } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { errorMessage } from '../../services/api';
import { adminApi, examsApi } from '../../services/endpoints';
import type { AdminViolationAttempt, AdminViolationStudentGroup, ViolationQuery, ViolationType } from '../../types';
import { yearLabel } from '../../utils/format';

const PAGE_SIZE = 12;
const VIOLATION_LABEL: Record<ViolationType, string> = {
  TAB_SWITCH: 'Tab switch', WINDOW_BLUR: 'Window blur', FULLSCREEN_EXIT: 'Fullscreen exit', COPY_ATTEMPT: 'Copy attempt',
  PASTE_ATTEMPT: 'Paste attempt', CUT_ATTEMPT: 'Cut attempt', RIGHT_CLICK: 'Right click', PAGE_LEAVE: 'Page leave',
};

function StudentCard({ group, onReopen }: { group: AdminViolationStudentGroup; onReopen: (a: AdminViolationAttempt) => void }) {
  const counts = useMemo(() => {
    const m = new Map<ViolationType, number>();
    group.violations.forEach((v) => m.set(v.type, (m.get(v.type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [group.violations]);

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden />
          <span className="font-semibold text-slate-900">{group.student.name}</span>
          <span className="text-sm font-normal text-slate-500">{group.student.studentId} · {yearLabel(group.student.year)}</span>
          <Badge tone="amber">{group.total} violation{group.total === 1 ? '' : 's'}</Badge>
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {group.attempts.map((a) => (
            <div key={a.attemptId} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1 pl-2.5 pr-1">
              <span className="max-w-[12rem] truncate text-xs font-medium text-slate-600" title={a.examTitle}>{a.examTitle}</span>
              {a.canReopen
                ? <Button size="sm" variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => onReopen(a)}>Open exam</Button>
                : <Badge tone="green">In progress</Badge>}
            </div>
          ))}
        </div>
      }
    >
      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Violation counts by type">
        {counts.map(([t, n]) => <li key={t}><Badge tone="amber">{VIOLATION_LABEL[t]}: {n}</Badge></li>)}
      </ul>
      <ol className="divide-y divide-slate-100 text-sm">
        {group.violations.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{VIOLATION_LABEL[v.type]}</span>
              <span className="text-xs text-slate-400">{v.examTitle}</span>
              {v.details && <span className="text-slate-500">- {v.details}</span>}
            </span>
            <time dateTime={v.createdAt} className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function ViolationsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [examId, setExamId] = useState('');
  const [year, setYear] = useState<'' | 'ONE_YEAR' | 'TWO_YEAR'>('');
  const [type, setType] = useState<'' | ViolationType>('');
  const [page, setPage] = useState(1);
  const dSearch = useDebounce(search);

  const [pending, setPending] = useState<AdminViolationAttempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => setPage(1), [dSearch, examId, year, type]);

  const exams = useAsync(() => examsApi.list(), []);
  const params: ViolationQuery = {
    search: dSearch || undefined, examId: examId || undefined, year: year || undefined, type: type || undefined,
  };
  const { data, loading, error, reload } = useAsync(
    () => adminApi.violations({ ...params, page, pageSize: PAGE_SIZE }),
    [dSearch, examId, year, type, page],
  );

  const reopen = async () => {
    if (!pending) return;
    setBusy(true); setDialogError(null);
    try {
      await adminApi.reopenAttempt(pending.attemptId);
      toast(`"${pending.examTitle}" reopened for the student`, 'success');
      setPending(null); reload();
    } catch (e) { setDialogError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Violations" subtitle="Every student's proctoring events, grouped by student"
        actions={<Link to="/admin/results"><Button variant="secondary">View results</Button></Link>} />
      <Card padded={false} className="mb-4">
        <FilterBar>
          <div className="w-full sm:w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search student ID, name or exam" /></div>
          <div className="w-full sm:w-48">
            <Select label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">All exams</option>
              {(exams.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value as typeof year)}>
              <option value="">All years</option><option value="ONE_YEAR">1st Year</option><option value="TWO_YEAR">2nd Year</option>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Select label="Violation" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="">All types</option>
              {(Object.keys(VIOLATION_LABEL) as ViolationType[]).map((t) => <option key={t} value={t}>{VIOLATION_LABEL[t]}</option>)}
            </Select>
          </div>
          <Button variant="ghost" onClick={() => { setSearch(''); setExamId(''); setYear(''); setType(''); }}>Clear filters</Button>
        </FilterBar>
      </Card>

      {loading && !data ? <LoadingSpinner /> : error || !data ? <ErrorState message={error ?? 'Could not load violations'} onRetry={reload} /> : data.items.length === 0 ? (
        <Card><EmptyState title="No violations recorded" description="Proctoring events will appear here as students take exams." /></Card>
      ) : (
        <ul className="space-y-4">
          {data.items.map((g) => <li key={g.student.id}><StudentCard group={g} onReopen={(a) => { setPending(a); setDialogError(null); }} /></li>)}
        </ul>
      )}
      {data && data.total > PAGE_SIZE && (
        <Card padded={false} className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} /></Card>
      )}

      <ConfirmDialog open={!!pending} loading={busy} onCancel={() => { setPending(null); setDialogError(null); }} onConfirm={() => void reopen()}
        title="Open exam for this student?" confirmLabel="Open exam"
        message={pending && (
          <>
            <p>Reopen <strong>{pending.examTitle}</strong> for this student in the <strong>same attempt</strong>? Their saved code is kept and the timer restarts at the full <strong>{pending.durationMinutes} minutes</strong>.</p>
            <p className="mt-2 text-slate-500">The student's previous result is replaced when they submit again. If the exam was closed, it becomes available again.</p>
            {dialogError && <div className="mt-3"><Alert>{dialogError}</Alert></div>}
          </>
        )} />
    </div>
  );
}
