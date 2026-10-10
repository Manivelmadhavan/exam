import { Badge, Card, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { yearLabel } from '../utils/format';
import { Reveal } from '../components/motion/Reveal';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  const rows: Array<[string, string | null | undefined]> = user.role === 'ADMIN'
    ? [['Name', user.name], ['Username', user.username], ['Email', user.email]]
    : [['Student ID', user.studentId], ['Name', user.name], ['Year', user.year ? yearLabel(user.year) : null], ['Email', user.email], ['Phone', user.phone], ['Department', user.department], ['Batch', user.batch], ['Roll number', user.rollNumber]];
  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" subtitle="Your account details" />
      <Reveal animation="fade-up" delay="1">
        <Card title={<span className="flex items-center gap-2">{user.name} <Badge tone="blue">{user.role === 'ADMIN' ? 'Admin' : 'Student'}</Badge></span>}>
          <dl className="grid gap-5 sm:grid-cols-2">
            {rows.map(([k, v], i) => (
              <Reveal key={k} animation="fade-in" delay={String(Math.min(i + 1, 4)) as '1' | '2' | '3' | '4'}>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{v || '-'}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
          <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-inset ring-brand-100">To change your password, ask your teacher to reset it.</p>
        </Card>
      </Reveal>
    </div>
  );
}