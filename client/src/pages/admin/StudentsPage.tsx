import { Eye, KeyRound, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, ConfirmDialog, Column, FilterBar, Input, Modal, PageHeader, Pagination, SearchBar, Select, Table } from '../../components/ui';
import { Alert, Button } from '../../components/AdminBits';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { ApiError, errorMessage } from '../../services/api';
import { studentsApi } from '../../services/endpoints';
import type { Student, Year } from '../../types';
import { formatDateTime, yearLabel } from '../../utils/format';

const PAGE_SIZE = 10;

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{value || '-'}</dd></div>;
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<'' | Year>('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  useEffect(() => setPage(1), [debounced, year, status]);

  const { data, loading, error, reload } = useAsync(
    () => studentsApi.list({ search: debounced || undefined, year: year || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [debounced, year, status, page],
  );

  const [viewing, setViewing] = useState<Student | null>(null);
  const [resetting, setResetting] = useState<Student | null>(null);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [toggling, setToggling] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const closeAll = () => { setResetting(null); setDeleting(null); setToggling(null); setPassword(''); setDialogError(null); };

  const resetPassword = async () => {
    if (!resetting) return;
    if (password.length < 6) { setDialogError('Password must be at least 6 characters'); return; }
    setBusy(true);
    try { await studentsApi.resetPassword(resetting.id, password); toast(`Password reset for ${resetting.studentId}`, 'success'); closeAll(); }
    catch (e) { setDialogError(errorMessage(e)); } finally { setBusy(false); }
  };
  const toggle = async () => {
    if (!toggling) return;
    setBusy(true);
    try {
      await studentsApi.setStatus(toggling.id, toggling.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
      toast(toggling.status === 'ACTIVE' ? 'Student deactivated' : 'Student activated', 'success'); closeAll(); reload();
    } catch (e) { setDialogError(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try { await studentsApi.remove(deleting.id); toast('Student deleted', 'success'); closeAll(); reload(); }
    catch (e) {
      const code = e instanceof ApiError ? e.errorCode : '';
      setDialogError(code === 'STUDENT_HAS_ATTEMPTS' ? `${errorMessage(e)} Deactivate the student instead to block sign-in while keeping their results.` : errorMessage(e));
    } finally { setBusy(false); }
  };

  const columns: Column<Student>[] = [
    { key: 'studentId', header: 'Student ID', render: (s) => <span className="font-medium text-slate-900">{s.studentId}</span> },
    { key: 'name', header: 'Name', render: (s) => s.name },
    { key: 'year', header: 'Year', render: (s) => yearLabel(s.year) },
    { key: 'email', header: 'Email', render: (s) => s.email ?? '-' },
    { key: 'status', header: 'Status', render: (s) => <Badge tone={s.status === 'ACTIVE' ? 'green' : 'gray'}>{s.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created', header: 'Created', render: (s) => formatDateTime(s.createdAt) },
    {
      key: 'actions', header: 'Actions', render: (s) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" aria-label={`View ${s.name}`} title="View" onClick={() => setViewing(s)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} title="Edit" onClick={() => navigate(`/admin/students/${s.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={`Reset password for ${s.name}`} title="Reset password" onClick={() => { setResetting(s); setPassword(''); setDialogError(null); }}><KeyRound className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={`${s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${s.name}`} title={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => { setToggling(s); setDialogError(null); }}><Power className={`h-4 w-4 ${s.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} /></Button>
          <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} title="Delete" onClick={() => { setDeleting(s); setDialogError(null); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const filtered = !!(debounced || year || status);
  return (
    <div>
      <PageHeader title="Students" subtitle="Register and manage student accounts" actions={<Link to="/admin/students/create"><Button icon={<Plus className="h-4 w-4" />}>Register student</Button></Link>} />
      <Card padded={false}>
        <FilterBar>
          <div className="w-full sm:w-72"><SearchBar value={search} onChange={setSearch} placeholder="Search by student ID or name" /></div>
          <div className="w-36"><Select label="Year" value={year} onChange={(e) => setYear(e.target.value as '' | Year)}><option value="">All years</option><option value="ONE_YEAR">1 Year</option><option value="TWO_YEAR">2 Year</option></Select></div>
          <div className="w-36"><Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></div>
        </FilterBar>
        <Table columns={columns} rows={data?.items} rowKey={(s) => s.id} loading={loading} error={error} onRetry={reload}
          emptyTitle={filtered ? 'No students match your filters' : 'No students registered'} emptyDescription={filtered ? undefined : 'Register a student to get started.'} />
        {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Student details" footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Student ID" value={viewing.studentId} /><Detail label="Name" value={viewing.name} />
            <Detail label="Year" value={yearLabel(viewing.year)} /><Detail label="Status" value={viewing.status} />
            <Detail label="Email" value={viewing.email} /><Detail label="Phone" value={viewing.phone} />
            <Detail label="Department" value={viewing.department} /><Detail label="Batch" value={viewing.batch} />
            <Detail label="Roll number" value={viewing.rollNumber} /><Detail label="Registered" value={formatDateTime(viewing.createdAt)} />
            {viewing._count && <><Detail label="Attempts" value={viewing._count.attempts} /><Detail label="Results" value={viewing._count.results} /></>}
          </dl>
        )}
      </Modal>

      <Modal open={!!resetting} onClose={closeAll} title={`Reset password${resetting ? ` - ${resetting.studentId}` : ''}`}
        footer={<><Button variant="secondary" onClick={closeAll} disabled={busy}>Cancel</Button><Button onClick={() => void resetPassword()} loading={busy}>Reset password</Button></>}>
        <div className="space-y-3">
          {dialogError && <Alert>{dialogError}</Alert>}
          <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 6 characters. Share it with the student securely." />
        </div>
      </Modal>

      <ConfirmDialog open={!!toggling} loading={busy} onCancel={closeAll} onConfirm={() => void toggle()}
        title={toggling?.status === 'ACTIVE' ? 'Deactivate student?' : 'Activate student?'} confirmLabel={toggling?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} danger={toggling?.status === 'ACTIVE'}
        message={<><p>{toggling?.status === 'ACTIVE' ? `${toggling?.name} will no longer be able to sign in. Existing results are kept.` : `${toggling?.name} will be able to sign in again.`}</p>{dialogError && <div className="mt-3"><Alert>{dialogError}</Alert></div>}</>} />

      <ConfirmDialog open={!!deleting} loading={busy} danger onCancel={closeAll} onConfirm={() => void remove()} title="Delete student?" confirmLabel="Delete"
        message={<><p>Permanently delete {deleting?.name} ({deleting?.studentId})? Their attempts and results are deleted too. This cannot be undone.</p>{dialogError && <div className="mt-3"><Alert>{dialogError}</Alert></div>}</>} />
    </div>
  );
}
