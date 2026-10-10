import { BarChart3, BookOpen, CheckCircle2, ClipboardList, GraduationCap, PlayCircle, Sparkles, Target, Users } from 'lucide-react';
import { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, EmptyState, ErrorState, LoadingSpinner, PageHeader, StatCard } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { adminApi } from '../../services/endpoints';
import { Reveal } from '../../components/motion/Reveal';
import { useAuth } from '../../context/AuthContext';

const AXIS = { fontSize: 12, fill: '#64748b' };
const GRID = '#eef2f7';
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(15,23,42,.15)', fontSize: 12 };

const shorten = (s: string) => (s.length > 14 ? `${s.slice(0, 13)}...` : s);

function ChartCard({ title, hint, children, empty }: { title: string; hint?: string; children: ReactNode; empty: boolean }) {
  return (
    <Card title={title}>
      {empty ? <EmptyState title="No data yet" description="This chart fills in once students submit exams." />
        : <><div className="h-72 w-full" role="img" aria-label={title}>{children}</div>{hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}</>}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);

  if (loading && !data) return <LoadingSpinner label="Loading dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? 'Dashboard unavailable'} onRetry={reload} />;

  const { cards, charts } = data;
  const perExam = charts.perExam.map((e) => ({ ...e, label: shorten(e.exam) }));
  const yearData = charts.yearPerformance;
  const barGrad = (id: string, from: string, to: string) => (
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></linearGradient></defs>
  );

  return (
    <div className="space-y-6">
      <Reveal animation="fade-up">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lift sm:p-8">
          <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-accent-600/30 blur-3xl" />
          <p aria-hidden className="absolute bottom-4 right-6 font-mono text-6xl font-extrabold text-white/5 sm:text-7xl">{'</>'}</p>
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-200"><Sparkles className="h-4 w-4" aria-hidden />Teacher overview</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {user?.name}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {cards.totalSubmissions > 0
                ? <>Across <strong className="text-white">{cards.totalExams} exam{cards.totalExams === 1 ? '' : 's'}</strong> you've collected <strong className="text-white">{cards.totalSubmissions} submissions</strong> with an average score of <strong className="text-white">{Math.round(cards.averageScore * 10) / 10}%</strong>.</>
                : 'Publish an exam to start collecting submissions and student performance insights here.'}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay="1">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total students" value={cards.totalStudents} icon={<Users className="h-5 w-5" />} tone="blue" />
          <StatCard label="1st year students" value={cards.oneYearStudents} icon={<GraduationCap className="h-5 w-5" />} tone="blue" />
          <StatCard label="2nd year students" value={cards.twoYearStudents} icon={<GraduationCap className="h-5 w-5" />} tone="accent" />
          <StatCard label="Total exams" value={cards.totalExams} icon={<BookOpen className="h-5 w-5" />} tone="purple" />
          <StatCard label="Active exams" value={cards.activeExams} icon={<PlayCircle className="h-5 w-5" />} tone="green" />
          <StatCard label="Completed exams" value={cards.completedExams} icon={<CheckCircle2 className="h-5 w-5" />} tone="purple" />
          <StatCard label="Total submissions" value={cards.totalSubmissions} icon={<ClipboardList className="h-5 w-5" />} tone="amber" />
          <StatCard label="Average score" value={`${Math.round(cards.averageScore * 10) / 10}%`} icon={<Target className="h-5 w-5" />} tone="blue" />
        </div>
      </Reveal>

      <Reveal animation="fade-up" delay="2">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Exam participation" hint="Students who submitted an attempt per exam." empty={perExam.length === 0}>
            <ResponsiveContainer>
              <BarChart data={perExam} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                {barGrad('g-participants', '#2563eb', '#7c3aed')}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.exam ?? ''} />
                <Bar dataKey="participants" name="Participants" fill="url(#g-participants)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Average marks per exam" hint="Average marks achieved per exam." empty={perExam.length === 0}>
            <ResponsiveContainer>
              <LineChart data={perExam} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.exam ?? ''} />
                <Line type="monotone" dataKey="averageMarks" name="Average marks" stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Year-wise performance (average %)" hint="Average percentage per target year." empty={yearData.length === 0}>
            <ResponsiveContainer>
              <BarChart data={yearData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                {barGrad('g-years', '#8b5cf6', '#6366f1')}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={AXIS} tickLine={false} />
                <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={tooltipStyle} />
                <Bar dataKey="averagePercentage" name="Average %" fill="url(#g-years)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Exam-wise performance by year" hint="1st vs 2nd year average marks per exam." empty={perExam.length === 0}>
            <ResponsiveContainer>
              <BarChart data={perExam} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-one" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
                  <linearGradient id="g-two" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.exam ?? ''} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="oneYearAverage" name="1st year" fill="url(#g-one)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="twoYearAverage" name="2nd year" fill="url(#g-two)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Reveal>
      <p className="flex items-center gap-2 text-xs text-slate-400"><BarChart3 className="h-4 w-4" aria-hidden />Charts include submitted attempts only.</p>
    </div>
  );
}