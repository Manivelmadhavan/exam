import { ReactNode } from 'react';
import { ShieldCheck, UserRound, Braces } from 'lucide-react';
import { Logo } from './Navbar';
import { CodeWindow } from './motion/CodeWindow';
import { FloatingSymbols } from './motion/FloatingSymbols';
import { Typewriter } from './motion/Typewriter';
import { Reveal } from './motion/Reveal';

interface Props {
  role: 'student' | 'admin';
  children: ReactNode;
}

const TERMINAL_LINES: Record<Props['role'], string[]> = {
  student: ['$ compile solution.py', 'Running tests...', '✔ 12 / 12 test cases passed', 'Score: 100.0 %'],
  admin: ['$ exam --publish java-basics', 'Publishing exam...', '✔ Available to 1st & 2nd year', '42 registered students notified'],
};

/** Split-screen animated shell shared by the login screens. */
export function AuthShell({ role, children }: Props) {
  const isAdmin = role === 'admin';
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-white">
      {/* decorative background */}
      <div aria-hidden className="absolute inset-0 bg-mesh" />
      <div aria-hidden className="absolute -left-32 -top-32 h-96 w-96 animate-blob rounded-full bg-accent-400/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] animate-blob rounded-full bg-brand-400/25 blur-3xl [animation-delay:-7s]" />
      <FloatingSymbols count={16} className="opacity-60" />

      {/* form column */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-10 lg:w-[46%] lg:px-10">
        <Reveal animation="fade-up" className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur">
              <Braces className="h-3.5 w-3.5" aria-hidden /> Java · C++ · Python
            </span>
            <h1 className="text-3xl">{isAdmin ? 'Teacher / Admin Login' : 'Student Login'}</h1>
            <p className="mt-1 text-sm text-slate-500">Online Programming Examination System</p>
          </div>
          {children}
        </Reveal>
      </div>

      {/* hero column */}
      <div className="relative z-10 hidden w-[54%] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 lg:flex">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-600/30 blur-3xl" />
        <Reveal animation="fade-in" className="relative flex items-center gap-3">
          <Logo size="md" />
          <div>
            <p className="font-bold text-white">CodeArena</p>
            <p className="text-xs text-slate-400">Assessment platform</p>
          </div>
        </Reveal>

        <Reveal animation="fade-up" delay="2" className="relative max-w-xl">
          <h2 className="text-4xl font-extrabold leading-tight text-white xl:text-5xl">
            Master <span className="gradient-text">coding</span> with guided online exams.
          </h2>
          <p className="mt-4 text-slate-300">
            Solve real problems in <strong className="text-orange-300">Java</strong>, <strong className="text-sky-300">C++</strong> and{' '}
            <strong className="text-emerald-300">Python</strong> with instant, automatic evaluation.
          </p>
          <div className="mt-6 space-y-3">
            <CodeWindow />
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm backdrop-blur">
              <Typewriter lines={TERMINAL_LINES[role]} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
            {['public class', 'int main()', 'def solve()', '{ }', '</>'].map((t) => (
              <span key={t} className="animate-float rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-slate-200 backdrop-blur" style={{ animationDelay: `${Math.random() * 2}s` }}>
                {t}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal animation="fade-in" delay="4" className="relative flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4 text-brand-400" aria-hidden /> Secure student sessions</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent-400" aria-hidden /> Proctored exam mode</span>
          <span className="flex items-center gap-1.5"><Braces className="h-4 w-4 text-emerald-400" aria-hidden /> Auto evaluated</span>
        </Reveal>
      </div>
    </div>
  );
}