import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, PlayCircle, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { studentExamsApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSpinner, StatCard } from '../../components/ui';
import { ExamCard } from '../../components/ExamCard';
import { Reveal } from '../../components/motion/Reveal';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => studentExamsApi.list(), []);
  if (loading && !data) return <LoadingSpinner className="min-h-[50vh]" label="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const exams = data ?? [];
  const count = (a: string) => exams.filter((e) => e.availability === a).length;
  const active = exams.filter((e) => e.availability === 'AVAILABLE' || e.availability === 'IN_PROGRESS');

  return (
    <div className="space-y-8">
      {/* Welcome hero */}
      <Reveal animation="fade-up">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-600 p-8 text-white shadow-glow sm:p-10">
          <div aria-hidden className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -bottom-20 right-40 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />
          <p aria-hidden className="absolute bottom-6 right-6 font-mono text-6xl font-extrabold text-white/10 sm:text-7xl">{'{ }'}</p>
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-100"><Sparkles className="h-4 w-4" aria-hidden />Welcome back</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{user?.name}</h1>
            <p className="mt-2 max-w-lg text-sm text-brand-100/90 sm:text-base">
              {active.length > 0
                ? <>You have <strong className="text-white">{active.length} active exam{active.length === 1 ? '' : 's'}</strong> ready. Pick one and start coding.</>
                : 'No active exams right now — new exams will appear here when your teacher publishes them.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {active.length > 0 && <Link to="/student/exams" className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-soft transition-all hover:shadow-lift">
                View active exams <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available exams" value={count('AVAILABLE')} tone="green" icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Upcoming exams" value={count('UPCOMING')} tone="amber" icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="In progress" value={count('IN_PROGRESS')} tone="blue" icon={<PlayCircle className="h-5 w-5" />} />
        <StatCard label="Completed exams" value={count('COMPLETED')} tone="purple" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Reveal animation="fade-up" delay="2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">Ready to take</h2>
          <Link to="/student/exams" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            All exams <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        {active.length === 0
          ? <div className="card"><EmptyState title="No exams available" description="When your teacher publishes an exam for your year it will appear here." /></div>
          : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{active.map((e) => <ExamCard key={e.id} exam={e} />)}</div>}
      </Reveal>
    </div>
  );
}