import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ResultQuery, ResultRow } from '../types';
import { attemptStatusLabel, formatDateTime, formatDuration, yearLabel } from '../utils/format';
import { Badge, Column, Table } from './ui';

type SortKey = NonNullable<ResultQuery['sortBy']>;
interface Props {
  rows: ResultRow[] | undefined;
  sortBy?: SortKey; order?: 'asc' | 'desc';
  onSort: (sortBy: SortKey) => void;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}

function SortHeader({ label, field, sortBy, order, onSort }: { label: string; field: SortKey } & Pick<Props, 'sortBy' | 'order' | 'onSort'>) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      aria-label={`Sort by ${label}${active ? `, currently ${order === 'asc' ? 'ascending' : 'descending'}` : ''}`}>
      {label}<Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden />
    </button>
  );
}

export function ResultTable({ rows, sortBy, order, onSort, loading, error, onRetry }: Props) {
  const sh = (label: string, field: SortKey) => <SortHeader label={label} field={field} sortBy={sortBy} order={order} onSort={onSort} />;
  const columns: Column<ResultRow>[] = [
    { key: 'studentId', header: 'Student ID', render: (r) => <span className="font-medium text-slate-900">{r.studentId}</span> },
    { key: 'name', header: sh('Student Name', 'name'), render: (r) => r.studentName },
    { key: 'exam', header: 'Exam', render: (r) => r.examTitle },
    { key: 'year', header: 'Year', render: (r) => yearLabel(r.year) },
    { key: 'questions', header: 'Questions', render: (r) => r.totalQuestions },
    { key: 'attempted', header: 'Attempted', render: (r) => r.attemptedCount },
    { key: 'accepted', header: 'Accepted', render: (r) => r.acceptedCount },
    { key: 'marks', header: sh('Marks Obtained', 'marks'), render: (r) => <span className="font-bold tabular-nums text-slate-900">{r.obtainedMarks}<span className="text-xs font-medium text-slate-400"> / {r.totalMarks}</span></span> },
    { key: 'total', header: 'Total Marks', render: (r) => r.totalMarks },
    { key: 'pct', header: sh('Percentage', 'percentage'), render: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${Math.min(100, r.percentage)}%` }} />
        </span>
        <span className="font-semibold tabular-nums text-slate-700">{r.percentage.toFixed(1)}%</span>
      </span>
    ) },
    { key: 'time', header: 'Time Taken', render: (r) => formatDuration(r.timeTakenSeconds), className: 'whitespace-nowrap' },
    { key: 'submitted', header: sh('Submitted At', 'submittedAt'), render: (r) => formatDateTime(r.submittedAt), className: 'whitespace-nowrap' },
    {
      key: 'status', header: 'Status', render: (r) => (
        <span className="flex items-center gap-1">
          <Badge tone={r.status === 'EVALUATED' ? 'green' : 'gray'}>{attemptStatusLabel(r.status)}</Badge>
          {r.autoSubmitted && <Badge tone="amber">Auto</Badge>}
        </span>
      ),
    },
    { key: 'view', header: 'View', render: (r) => <Link to={`/admin/results/${r.id}`} aria-label={`View result of ${r.studentName} for ${r.examTitle}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50">View</Link> },
  ];
  return <Table columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} error={error} onRetry={onRetry} emptyTitle="No results found" />;
}

export default ResultTable;
