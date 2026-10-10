import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Code2, FileQuestion, Play, Trophy } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { studentExamsApi } from '../../services/endpoints';
import { Badge, Button, Card, ErrorState, LoadingSpinner } from '../../components/ui';
import { ExamInstructions } from '../../components/ExamInstructions';
import { availabilityMeta } from '../../components/ExamCard';
import { formatDateTime, languageLabel, yearLabel } from '../../utils/format';
import { Reveal } from '../../components/motion/Reveal';

export default function ExamOverviewPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const { data: exam, loading, error, reload } = useAsync(() => studentExamsApi.get(examId), [examId]);
  if (loading && !exam) return <LoadingSpinner className="min-h-[50vh]" label="Loading exam details..." />;
  if (error || !exam) return <ErrorState message={error ?? 'Exam not found'} onRetry={reload} />;
  const meta = availabilityMeta[exam.availability];

  const start = () => {
    if (exam.settings.fullscreenRequired) document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(`/student/exams/${exam.id}/start`);
  };
  const facts = [
    { icon: <Clock className="h-5 w-5" />, label: 'Duration', value: `${exam.durationMinutes} minutes`, tint: 'from-brand-500 to-blue-600' },
    { icon: <FileQuestion className="h-5 w-5" />, label: 'Questions', value: exam.questionCount, tint: 'from-accent-500 to-purple-700' },
    { icon: <Trophy className="h-5 w-5" />, label: 'Total marks', value: exam.totalMarks, tint: 'from-amber-400 to-orange-500' },
    { icon: <Code2 className="h-5 w-5" />, label: 'Languages', value: exam.allowedLanguages.map(languageLabel).join(', '), tint: 'from-emerald-500 to-teal-600' },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Reveal animation="fade-up">
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-soft sm:p-8">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-accent-500" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{yearLabel(exam.year)} · Coding Assessment</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{exam.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{formatDateTime(exam.startDateTime)} — {formatDateTime(exam.endDateTime)}</p>
            </div>
            <Badge tone={meta.tone} className="px-3 py-1 text-sm"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{meta.label}</Badge>
          </div>
          {exam.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{exam.description}</p>}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f, i) => (
              <Reveal key={f.label} animation="fade-up" delay={String(Math.min(i + 1, 4)) as '1' | '2' | '3' | '4'}>
                <div className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:shadow-soft">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${f.tint}`}>{f.icon}</span>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">{f.label}</dt>
                    <dd className="text-sm font-bold text-slate-900">{f.value}</dd>
                  </div>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay="2">
        <Card title="Instructions & rules">
          <ExamInstructions instructions={exam.instructions} settings={exam.settings} />
        </Card>
      </Reveal>

      <Reveal animation="fade-up" delay="3" className="flex flex-wrap items-center gap-3">
        {exam.availability === 'AVAILABLE' && (
          <Button onClick={start} className="px-8 py-3 text-base">
            <span className="absolute inset-0 animate-pulse-ring rounded-xl" aria-hidden />START EXAM <Play className="h-4 w-4" aria-hidden />
          </Button>
        )}
        {exam.availability === 'IN_PROGRESS' && exam.attemptId && <Link to={`/student/attempt/${exam.attemptId}`}><Button className="px-8 py-3 text-base">CONTINUE EXAM</Button></Link>}
        {exam.availability === 'COMPLETED' && (exam.resultId ? <Link to={`/student/results/${exam.resultId}`}><Button>View Result</Button></Link> : <p className="text-sm text-slate-600">Your result is being prepared.</p>)}
        {exam.availability === 'UPCOMING' && <p className="text-sm text-slate-600">This exam opens on {formatDateTime(exam.startDateTime)}.</p>}
        {exam.availability === 'MISSED' && <p className="text-sm text-slate-600">The exam window has closed.</p>}
        <Link to="/student/exams" className="group inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />Back to exams
        </Link>
      </Reveal>
    </div>
  );
}