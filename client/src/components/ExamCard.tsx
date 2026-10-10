import { Link } from 'react-router-dom';
import { CalendarClock, Clock, FileQuestion, Trophy } from 'lucide-react';
import { Badge, Button } from './ui';
import type { Availability, StudentExamCard } from '../types';
import { formatDateTime, yearLabel } from '../utils/format';
import { Reveal } from './motion/Reveal';

export const availabilityMeta: Record<Availability, { label: string; tone: 'green' | 'blue' | 'amber' | 'gray' | 'red' }> = {
  AVAILABLE: { label: 'Available', tone: 'green' },
  IN_PROGRESS: { label: 'In progress', tone: 'blue' },
  UPCOMING: { label: 'Upcoming', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'gray' },
  MISSED: { label: 'Missed', tone: 'red' },
};

const strip: Record<Availability, string> = {
  AVAILABLE: 'from-emerald-500 to-teal-500',
  IN_PROGRESS: 'from-brand-500 to-indigo-600',
  UPCOMING: 'from-amber-400 to-orange-500',
  COMPLETED: 'from-slate-400 to-slate-500',
  MISSED: 'from-red-400 to-rose-500',
};

const watermark: Record<Availability, string> = {
  AVAILABLE: 'text-emerald-200/70',
  IN_PROGRESS: 'text-brand-200/70',
  UPCOMING: 'text-amber-200/70',
  COMPLETED: 'text-slate-200/80',
  MISSED: 'text-red-200/70',
};

const stat = 'flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-inset ring-slate-100 transition-colors hover:bg-brand-50';

export function ExamCard({ exam }: { exam: StudentExamCard }) {
  const meta = availabilityMeta[exam.availability];
  return (
    <Reveal animation="fade-up" className="h-full">
      <article className="card card-hover relative flex h-full flex-col overflow-hidden">
        <div aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${strip[exam.availability]}`} />
        <div aria-hidden className={`pointer-events-none absolute -bottom-8 -right-8 text-[7rem] leading-none ${watermark[exam.availability]}`}>
          {exam.availability === 'AVAILABLE' ? '<>' : exam.availability === 'IN_PROGRESS' ? '{ }' : exam.availability === 'UPCOMING' ? '?>' : '//'}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">{exam.title}</h3>
            <Badge tone={meta.tone}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{meta.label}</Badge>
          </div>
          {exam.description && <p className="line-clamp-2 text-sm text-slate-600">{exam.description}</p>}
          <dl className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
            <div className={stat}><Clock className="h-4 w-4 text-brand-500" aria-hidden /><dt className="sr-only">Duration</dt><dd>{exam.durationMinutes} min</dd></div>
            <div className={stat}><FileQuestion className="h-4 w-4 text-accent-500" aria-hidden /><dt className="sr-only">Questions</dt><dd>{exam.questionCount} questions</dd></div>
            <div className={stat}><Trophy className="h-4 w-4 text-amber-500" aria-hidden /><dt className="sr-only">Total marks</dt><dd>{exam.totalMarks} marks</dd></div>
            <div className={stat}><span className="text-xs text-slate-400" aria-hidden>Yr</span><dt className="sr-only">Year</dt><dd>{yearLabel(exam.year)}</dd></div>
          </dl>
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-4 w-4" aria-hidden />{formatDateTime(exam.startDateTime)} - {formatDateTime(exam.endDateTime)}</p>
          <div className="mt-auto pt-2">
            {exam.availability === 'AVAILABLE' && <Link to={`/student/exams/${exam.id}`}><Button className="w-full">Start Exam →</Button></Link>}
            {exam.availability === 'IN_PROGRESS' && exam.attemptId && <Link to={`/student/attempt/${exam.attemptId}`}><Button className="w-full">Continue Exam →</Button></Link>}
            {exam.availability === 'COMPLETED' && (exam.resultId
              ? <Link to={`/student/results/${exam.resultId}`}><Button variant="secondary" className="w-full">View Result</Button></Link>
              : <Button variant="secondary" className="w-full" disabled>Result is being prepared</Button>)}
            {exam.availability === 'UPCOMING' && <Button className="w-full" disabled>Scheduled {formatDateTime(exam.startDateTime)}</Button>}
            {exam.availability === 'MISSED' && <Button className="w-full" variant="secondary" disabled>Exam window closed</Button>}
          </div>
        </div>
      </article>
    </Reveal>
  );
}