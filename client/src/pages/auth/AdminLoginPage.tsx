import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { LoginForm } from './LoginForm';

export default function AdminLoginPage() {
  return <LoginForm role="ADMIN" title="Teacher / Admin Login" identifierLabel="Username or Email" identifierPlaceholder="admin"
    footer={<span className="flex items-center justify-center gap-1 text-slate-500">Student? <Link className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700" to="/student1"><GraduationCap className="h-3.5 w-3.5" />Log in here</Link></span>} />;
}