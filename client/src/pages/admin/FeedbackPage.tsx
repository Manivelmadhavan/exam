import { BadgeCheck, Eye, MessageSquareHeart, Star, Users } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { Badge, Card, Modal, PageHeader, StatCard, Table, Column, EmptyState, ErrorState, LoadingSpinner } from '../../components/ui';
import { Button } from '../../components/AdminBits';
import { useAsync } from '../../hooks/useAsync';
import { adminApi } from '../../services/endpoints';
import type { Feedback } from '../../types';
import { formatDateTime } from '../../utils/format';

const Info = ({ label, value }: { label: string; value: ReactNode }) => (
  <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-0.5 text-sm text-slate-800">{value || '-'}</dd></div>
);

function StarRow({ count }: { count: number | null | undefined }) {
  const n = Number(count) || 0;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={`h-3.5 w-3.5 ${i <= n ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
      ))}
    </span>
  );
}

export default function FeedbackPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.feedback(), []);
  const [viewing, setViewing] = useState<Feedback | null>(null);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const avg = (k: (f: Feedback) => number) => rows.length ? rows.reduce((s, f) => s + k(f), 0) / rows.length : 0;
    return {
      total: rows.length,
      overall: avg((f) => f.overallSatisfaction),
      ui: avg((f) => f.uiRating),
      noIssues: rows.filter((f) => f.issuesSeen.includes('No issues')).length,
    };
  }, [data]);

  const columns: Column<Feedback>[] = [
    { key: 'createdAt', header: 'Submitted', render: (f) => <span className="whitespace-nowrap">{formatDateTime(f.createdAt)}</span> },
    { key: 'student', header: 'Student', render: (f) => <div><p className="font-medium text-slate-900">{f.studentName}</p><p className="text-xs text-slate-500">{f.studentId}</p></div> },
    { key: 'classYear', header: 'Class / Year', render: (f) => f.classYear },
    { key: 'language', header: 'Language', render: (f) => f.language },
    { key: 'overall', header: 'Overall', render: (f) => <StarRow count={f.overallSatisfaction} /> },
    { key: 'useAgain', header: 'Would reuse', render: (f) => <Badge tone={f.useAgain === 'Yes' ? 'green' : f.useAgain === 'No' ? 'red' : 'amber'}>{f.useAgain}</Badge> },
    {
      key: 'actions', header: '', render: (f) => (
        <Button size="sm" variant="ghost" aria-label={`View feedback from ${f.studentName}`} title="View" onClick={() => setViewing(f)}><Eye className="h-4 w-4" /></Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Feedback submissions" subtitle="Student responses to the feedback form" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submissions" value={stats.total} tone="blue" icon={<MessageSquareHeart className="h-5 w-5" />} />
        <StatCard label="Avg. overall rating" value={stats.overall.toFixed(1)} tone="green" icon={<Star className="h-5 w-5" />} />
        <StatCard label="Avg. UI rating" value={stats.ui.toFixed(1)} tone="purple" icon={<BadgeCheck className="h-5 w-5" />} />
        <StatCard label="Reported no issues" value={stats.noIssues} tone="accent" icon={<Users className="h-5 w-5" />} />
      </div>
      <Card padded={false}>
        {loading && !data ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (data?.length ?? 0) === 0 ? (
          <EmptyState title="No feedback yet" description="Feedback submitted by students will appear here." />
        ) : (
          <Table columns={columns} rows={data} rowKey={(f) => f.id} />
        )}
      </Card>

      <Modal size="lg" open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Feedback from ${viewing.studentName}` : 'Feedback'}>
        {viewing && <FeedbackDetail f={viewing} />}
      </Modal>
    </div>
  );
}

function FeedbackDetail({ f }: { f: Feedback }) {
  const rows: Array<[string, ReactNode]> = [
    ['Student name', f.studentName], ['Student ID', f.studentId], ['Class / Year', f.classYear], ['Language used', f.language],
    ['Q5 · Log in & access', <StarRow count={f.loginEase} />], ['Q6 · UI & design', <StarRow count={f.uiRating} />],
    ['Q7 · Problem statement', f.problemReadability], ['Q8 · Code editor', <StarRow count={f.codeEditorRating} />],
    ['Q9 · Run Code feature', f.runCodeWorks], ['Q10 · Input/output panels', f.inputOutputEase],
    ['Q11 · Timer clear & accurate', f.timerVisible], ['Q12 · Time sufficient', f.timeSufficient],
    ['Q13 · Language support', f.languageSupport], ['Q14 · Execution speed', <StarRow count={f.executionSpeed} />],
    ['Q15 · Marks & results', f.resultsDisplayed], ['Q16 · Overall satisfaction', <StarRow count={f.overallSatisfaction} />],
    ['Q17 · Liked most', f.likedMost], ['Q18 · Issues experienced', f.issuesSeen.length ? f.issuesSeen.join(', ') : 'None selected'],
    ['Q19 · Suggested improvements', f.improvements], ['Q20 · Would use again', f.useAgain],
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Submitted {formatDateTime(f.createdAt)}</p>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => <Info key={label} label={label} value={value} />)}
      </dl>
    </div>
  );
}