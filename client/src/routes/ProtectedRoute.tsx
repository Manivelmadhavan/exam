import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import { LoadingSpinner } from '../components/ui';

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner label="Checking session..." className="min-h-screen" />;
  if (!user) return <Navigate to={role === 'ADMIN' ? '/admin1' : '/student1'} state={{ from: location.pathname }} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;
  return <>{children}</>;
}
