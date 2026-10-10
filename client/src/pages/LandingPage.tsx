import { Link, Navigate } from 'react-router-dom';
import { BarChart3, BookOpen, Braces, CheckCircle2, Code2, GraduationCap, PlayCircle, ShieldCheck, Sparkles, Timer, Trophy, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Navbar';
import { CodeWindow } from '../components/motion/CodeWindow';
import { FloatingSymbols } from '../components/motion/FloatingSymbols';
import { Reveal } from '../components/motion/Reveal';
import { Typewriter } from '../components/motion/Typewriter';

const stats = [
  { icon: <Braces className="h-5 w-5" aria-hidden />, label: 'Languages', value: '3', text: 'Java · C++ · Python' },
  { icon: <Timer className="h-5 w-5" aria-hidden />, label: 'Exam mode', value: 'Timed', text: 'Countdown-driven sessions' },
  { icon: <CheckCircle2 className="h-5 w-5" aria-hidden />, label: 'Evaluation', value: 'Auto', text: 'Test-case grading' },
  { icon: <BarChart3 className="h-5 w-5" aria-hidden />, label: 'Results', value: 'Instant', text: 'Scores & analytics' },
];

const features = [
  { icon: <ShieldCheck className="h-6 w-6" aria-hidden />, title: 'Proctored exam mode', text: 'Full-screen coding workspace with a live timer and locked navigation while an exam is running.' },
  { icon: <Code2 className="h-6 w-6" aria-hidden />, title: 'Multi-language editor', text: 'Write and run solutions in Java, C++ and Python with syntax highlighting and output console.' },
  { icon: <CheckCircle2 className="h-6 w-6" aria-hidden />, title: 'Test-case evaluation', text: 'Every submission is checked automatically against hidden test cases for instant, fair feedback.' },
  { icon: <BarChart3 className="h-6 w-6" aria-hidden />, title: 'Result analytics', text: 'Breakdowns per question, language and student so strengths and gaps are easy to spot.' },
  { icon: <Users className="h-6 w-6" aria-hidden />, title: 'Student management', text: 'Register and manage students across 1st and 2nd year batches from a single dashboard.' },
  { icon: <BookOpen className="h-6 w-6" aria-hidden />, title: 'Reusable question bank', text: 'Build a library of questions with multiple test cases and reuse them across exams.' },
];

const steps = [
  { n: '01', icon: <GraduationCap className="h-6 w-6" aria-hidden />, title: 'Sign in', text: 'Students enter with their student ID, teachers with their admin account.' },
  { n: '02', icon: <PlayCircle className="h-6 w-6" aria-hidden />, title: 'Take the exam', text: 'Solve timed coding problems in a distraction-free workspace with live feedback.' },
  { n: '03', icon: <Trophy className="h-6 w-6" aria-hidden />, title: 'Review results', text: 'Automatic evaluation shows your score, per-question breakdown and history instantly.' },
];

const TERMINAL_LINES = ['$ compile solution.py', 'Running 12 test cases...', '✔ All test cases passed', 'Score: 100.0 % · Rank #1'];

export default function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* decorative background */}
      <div aria-hidden className="absolute inset-0 bg-mesh" />
      <div aria-hidden className="absolute -top-40 left-1/3 h-[30rem] w-[30rem] animate-blob rounded-full bg-brand-400/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 right-0 h-96 w-96 animate-blob rounded-full bg-accent-500/20 blur-3xl [animation-delay:-6s]" />
      <FloatingSymbols count={14} />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-bold tracking-tight text-slate-900">CodeArena</span>
        </div>
        <Link to="/student1" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:brightness-110 active:scale-[.98]">
          Login
        </Link>
      </header>

      <main className="relative z-10">
        {/* hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-2 lg:pt-14">
          <div>
            <Reveal animation="fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Java · C++ · Python
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Online <span className="gradient-text">Programming</span> Examination
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-500 sm:text-lg">
                A modern platform for timed coding assessments with automatic evaluation. Take exams, run
                real code and get instant, fair results across three programming languages.
              </p>
              <Link to="/student1" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:brightness-110 active:scale-[.98]">
                Login
              </Link>
            </Reveal>
            <Reveal animation="fade-up" delay="3" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft backdrop-blur">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow">{s.icon}</span>
                  <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-900">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-600">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{s.text}</p>
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal animation="slide-in-right" delay="2" className="space-y-4 lg:pl-4">
            <CodeWindow />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-lift">
              <Typewriter lines={TERMINAL_LINES} className="text-xs" />
              <span className="hidden flex-col gap-1 font-mono text-[10px] text-emerald-400 sm:flex" aria-hidden>
                <span>● online</span>
                <span>● watching</span>
              </span>
            </div>
          </Reveal>
        </section>

        {/* features */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <Reveal animation="fade-up" className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Everything a coding exam needs</h2>
            <p className="mt-3 text-slate-500">From question banks and timed workspaces to automatic grading and analytics — in one clean, modern interface.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} animation="fade-up" delay={String((i % 3) + 1) as '1' | '2' | '3'}>
                <div className="group h-full rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow transition-transform duration-300 group-hover:scale-110">{f.icon}</span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <Reveal animation="fade-up" className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How it works</h2>
            <p className="mt-3 text-slate-500">Three simple steps between signing in and a complete result.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} animation="fade-up" delay={String(i + 1) as '1' | '2' | '3'}>
                <div className="relative h-full overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-xl">
                  <span aria-hidden className="absolute right-5 top-4 font-mono text-4xl font-extrabold text-brand-100">{s.n}</span>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-brand-600">{s.icon}</span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="relative z-10 border-t border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="font-bold tracking-tight text-slate-900">CodeArena</span>
            <span className="text-slate-400">· Online Programming Examination System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}