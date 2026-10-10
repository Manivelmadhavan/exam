import { Link, useParams } from 'react-router-dom';
import { MessageSquareHeart } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { studentExamsApi } from '../../services/endpoints';
import { ErrorState, LoadingSpinner, PageHeader } from '../../components/ui';
import { ResultSummary } from '../../components/ResultSummary';
import { Reveal } from '../../components/motion/Reveal';

export default function StudentResultPage() {
  const { resultId = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => studentExamsApi.result(resultId), [resultId]);
  if (loading && !data) return <LoadingSpinner className="min-h-[50vh]" label="Loading your result..." />;
  if (error || !data) return <ErrorState message={error ?? 'Result not found'} onRetry={reload} />;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Exam Result"
        actions={<Link className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700" to="/student/results">
          All results <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
        </Link>} />
      <ResultSummary result={data} />
      <Reveal animation="fade-up" delay="2">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 p-6 text-white shadow-glow">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquareHeart className="h-5 w-5" aria-hidden />How did it go?</h2>
            <p className="mt-1 text-sm text-white/85">Tell us about your experience. Your feedback takes about 2–3 minutes and helps us improve the platform.</p>
          </div>
          <Link to="/student/feedback" className="inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-soft transition-all hover:shadow-lift">
            Share your feedback
          </Link>
        </div>
      </Reveal>
    </div>
  );
}