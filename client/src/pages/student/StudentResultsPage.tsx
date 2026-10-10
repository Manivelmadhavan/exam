import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { studentExamsApi } from '../../services/endpoints';
import { Badge, Button, Card, PageHeader, Table, Column } from '../../components/ui';
import type { StudentResultListItem } from '../../types';
import { attemptStatusLabel, formatDateTime } from '../../utils/format';
import { Reveal } from '../../components/motion/Reveal';

const statusTone = (s: string) => s === 'EVALUATED' ? 'green' : s === 'SUBMITTED' ? 'blue' : 'amber';

export default function StudentResultsPage() {
  const { data, loading, error, reload } = useAsync(() => studentExamsApi.results(), []);

  const columns: Column<StudentResultListItem>[] = [
    { key: 'exam', header: 'Exam', render: (r) => <span className="font-semibold text-slate-900">{r.examTitle}</span> },
    { key: 'date', header: 'Submitted', render: (r) => formatDateTime(r.submittedAt) },
    {
      key: 'marks', header: 'Marks', render: (r) => (
        <span className="inline-flex items-baseline gap-1 font-bold tabular-nums">
          <span className="text-slate-900">{r.obtainedMarks}</span>
          <span className="text-xs font-medium text-slate-400">/ {r.totalMarks}</span>
        </span>
      ),
    },
    {
      key: 'pct', header: 'Percentage', render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${Math.min(100, r.percentage)}%` }} />
          </span>
          <span className="font-semibold tabular-nums text-slate-700">{r.percentage}%</span>
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', render: (r) => (
        <span className="flex gap-1">
          <Badge tone={statusTone(r.status) as 'green' | 'blue' | 'amber'}>{attemptStatusLabel(r.status)}</Badge>
          {r.autoSubmitted && <Badge tone="amber">Auto</Badge>}
        </span>
      ),
    },
    { key: 'view', header: '', render: (r) => <Link to={`/student/results/${r.id}`}><Button size="sm" variant="secondary">View Result</Button></Link> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Results" subtitle="All your completed exams"
        actions={<span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800"><Trophy className="h-4 w-4" aria-hidden />{(data ?? []).length} exams evaluated</span>} />
      <Reveal animation="fade-up" delay="1">
        <Card padded={false}>
          <Table columns={columns} rows={data} loading={loading} error={error} onRetry={reload} rowKey={(r) => r.id} emptyTitle="No results found"
            emptyDescription="Your results will appear here after you complete an exam." />
        </Card>
      </Reveal>
    </div>
  );
}