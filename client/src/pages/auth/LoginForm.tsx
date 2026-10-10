import { ReactNode, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, UserRound } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';

const schema = z.object({ identifier: z.string().trim().min(1, 'This field is required'), password: z.string().min(1, 'Password is required') });
type Values = z.infer<typeof schema>;

export function LoginForm({ role, title, identifierLabel, identifierPlaceholder, hint, footer }: {
  role: 'ADMIN' | 'STUDENT'; title: string; identifierLabel: string; identifierPlaceholder: string; hint?: ReactNode; footer?: ReactNode;
}) {
  const { user, loginAdmin, loginStudent, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      if (role === 'ADMIN') await loginAdmin(v.identifier, v.password); else await loginStudent(v.identifier, v.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(role === 'ADMIN' ? '/admin' : '/student') ? from : role === 'ADMIN' ? '/admin' : '/student', { replace: true });
    } catch (e) { setError(errorMessage(e, 'Unable to log in')); }
  };

  const isAdmin = role === 'ADMIN';
  return (
    <AuthShell role={isAdmin ? 'admin' : 'student'}>
      <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-lift backdrop-blur-xl sm:p-8">
        {sessionExpired && <p role="alert" className="animate-fade-in mb-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200/60">Your session has expired. Please log in again.</p>}
        {error && <p role="alert" className="animate-fade-in mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200/60">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700">{identifierLabel}</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input id="identifier" placeholder={identifierPlaceholder} autoComplete="username" autoFocus error={errors.identifier?.message}
                className="pl-10" {...register('identifier')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input id="password" type="password" autoComplete="current-password" error={errors.password?.message}
                className="pl-10" {...register('password')} />
            </div>
          </div>
          <Button type="submit" className="w-full py-2.5 text-base" loading={isSubmitting}>Log in</Button>
        </form>
        {hint && <p className="mt-4 text-center text-xs text-slate-500">{hint}</p>}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm">
          {footer ?? <Link className="font-semibold text-brand-600 hover:text-brand-700" to="/">← Back to home</Link>}
        </div>
      </div>
    </AuthShell>
  );
}