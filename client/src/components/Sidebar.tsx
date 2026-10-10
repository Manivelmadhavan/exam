import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, ClipboardList, FileCode2, LayoutDashboard, ListChecks, MessageSquareHeart, ShieldAlert, Trophy, User, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Role } from '../types';
import { Logo } from './Navbar';

interface LinkItem { to: string; label: string; icon: ReactNode; end?: boolean }

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx('nav-pill flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
    isActive ? 'is-active' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800');

function Group({ title, links, onClose }: { title: string; links: LinkItem[]; onClose: () => void }) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <div className="space-y-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={onClose} className={linkClass}>
            <span className="shrink-0 text-current">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const overview: LinkItem[] = role === 'ADMIN'
    ? [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard style={{ width: 18, height: 18 }} />, end: true },
      { to: '/admin/students', label: 'Students', icon: <Users style={{ width: 18, height: 18 }} /> },
      { to: '/admin/exams', label: 'Exams', icon: <ClipboardList style={{ width: 18, height: 18 }} /> },
      { to: '/admin/questions', label: 'Questions', icon: <FileCode2 style={{ width: 18, height: 18 }} /> },
    ]
    : [
      { to: '/student', label: 'Dashboard', icon: <LayoutDashboard style={{ width: 18, height: 18 }} />, end: true },
      { to: '/student/exams', label: 'Exams', icon: <BookOpen style={{ width: 18, height: 18 }} /> },
      { to: '/student/results', label: 'My Results', icon: <Trophy style={{ width: 18, height: 18 }} /> },
      { to: '/student/feedback', label: 'Feedback', icon: <MessageSquareHeart style={{ width: 18, height: 18 }} /> },
    ];

  const secondary: LinkItem[] = role === 'ADMIN'
    ? [
      { to: '/admin/results', label: 'All Results', icon: <ListChecks style={{ width: 18, height: 18 }} />, end: true },
      { to: '/admin/results/1-year', label: '1st Year Results', icon: <Trophy style={{ width: 18, height: 18 }} /> },
      { to: '/admin/results/2-year', label: '2nd Year Results', icon: <Trophy style={{ width: 18, height: 18 }} /> },
      { to: '/admin/violations', label: 'Violations', icon: <ShieldAlert style={{ width: 18, height: 18 }} /> },
      { to: '/admin/feedback', label: 'Feedback', icon: <MessageSquareHeart style={{ width: 18, height: 18 }} /> },
      { to: '/admin/profile', label: 'Profile', icon: <User style={{ width: 18, height: 18 }} /> },
    ]
    : [{ to: '/student/profile', label: 'Profile', icon: <User style={{ width: 18, height: 18 }} /> }];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200/80 bg-white/95 backdrop-blur-xl transition-all duration-300 lg:static lg:z-0 lg:translate-x-0 lg:pt-0',
        open ? 'translate-x-0 shadow-lift' : '-translate-x-full',
      )}>
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 lg:hidden">
          <Logo size="sm" />
          <span className="font-bold tracking-tight text-slate-900">CodeArena</span>
          <button aria-label="Close menu" onClick={onClose} className="ml-auto rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav aria-label="Main" className="flex h-[calc(100%-4rem)] flex-col gap-5 overflow-y-auto p-4 lg:h-[calc(100%-4rem)]">
          {role === 'ADMIN' ? (
            <>
              <Group title="Management" links={overview} onClose={onClose} />
              <Group title="Results & Feedback" links={secondary.slice(0, 5)} onClose={onClose} />
              <Group title="Account" links={secondary.slice(5)} onClose={onClose} />
            </>
          ) : (
            <>
              <Group title="Overview" links={overview} onClose={onClose} />
              <Group title="Account" links={secondary} onClose={onClose} />
            </>
          )}
          <div className="mt-auto rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 p-4 text-white shadow-glow">
            <p className="text-sm font-bold">{role === 'ADMIN' ? 'Teacher Console' : 'Assessment Portal'}</p>
            <p className="mt-1 text-xs text-white/80">Java · C++ · Python</p>
          </div>
        </nav>
      </aside>
    </>
  );
}