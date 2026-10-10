import { useState } from 'react';
import clsx from 'clsx';
import { useAsync } from '../../hooks/useAsync';
import { studentExamsApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSpinner, PageHeader } from '../../components/ui';
import { ExamCard } from '../../components/ExamCard';
import type { Availability } from '../../types';
import { Reveal } from '../../components/motion/Reveal';

const tabs: Array<{ key: Availability | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' }, { key: 'AVAILABLE', label: 'Available' }, { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'UPCOMING', label: 'Upcoming' }, { key: 'COMPLETED', label: 'Completed' }, { key: 'MISSED', label: 'Missed' },
];

export default function StudentExamsPage() {
  const { data, loading, error, reload } = useAsync(() => studentExamsApi.list(), []);
  const [tab, setTab] = useState<Availability | 'ALL'>('ALL');
  const all = data ?? [];
  const exams = all.filter((e) => tab === 'ALL' || e.availability === tab);
  return (
    <div className="space-y-6">
      <PageHeader title="Exams" subtitle="Exams assigned to your year" />
      <Reveal animation="fade-in" delay="1">
        <div role="tablist" aria-label="Filter exams" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-soft">
          {tabs.map((t) => {
            const n = t.key === 'ALL' ? all.length : all.filter((e) => e.availability === t.key).length;
            return (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={clsx('group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200',
                  tab === t.key ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
                {t.label}
                <span className={clsx('rounded-full px-1.5 py-0.5 text-xs tabular-nums transition-colors',
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200')}>{n}</span>
              </button>
            );
          })}
        </div>
      </Reveal>
      {loading && !data ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} />
        : exams.length === 0 ? <div className="card"><EmptyState title="No exams available" /></div>
          : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{exams.map((e) => <ExamCard key={e.id} exam={e} />)}</div>}
    </div>
  );
}