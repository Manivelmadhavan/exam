import { Link } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';
import { FloatingSymbols } from '../components/motion/FloatingSymbols';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl text-center">
      <FloatingSymbols count={8} />
      <span aria-hidden className="font-mono text-7xl font-extrabold text-slate-200">404</span>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow">
        <FileQuestion className="h-7 w-7" aria-hidden />
      </span>
      <h1>Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-lift">
        <Home className="h-4 w-4" aria-hidden /> Go home
      </Link>
    </div>
  );
}