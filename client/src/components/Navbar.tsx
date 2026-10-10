import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

export function Navbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button aria-label="Open menu" onClick={onMenu} className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="hidden lg:block"><Logo size="sm" /></div>
        <span className="hidden font-bold tracking-tight text-slate-900 sm:block md:hidden xl:block">Programming Exam System</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs leading-tight sm:block">
          <p className="font-semibold text-slate-800">{user?.name}</p>
          <p className="text-slate-500">{user?.role === 'ADMIN' ? 'Teacher / Admin' : user?.studentId}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void logout()}><LogOut className="h-4 w-4" /> Logout</Button>
      </div>
    </header>
  );
}

/** Brand mark: gradient rounded square with a code glyph. */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <span className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow ${dim} ${className ?? ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={icon}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent opacity-50" />
    </span>
  );
}