import { Download, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Alert, Button } from '../../components/AdminBits';
import { ResultTable } from '../../components/ResultTable';
import { Card, FilterBar, Input, PageHeader, Pagination, SearchBar, Select } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { download, errorMessage } from '../../services/api';
import { adminApi, examsApi } from '../../services/endpoints';
import type { ResultQuery } from '../../types';

const PAGE_SIZE = 15;
type Scope = 'all' | 'ONE_YEAR' | 'TWO_YEAR';
const TITLES: Record<Scope, string> = { all: 'All Results', ONE_YEAR: '1st Year Results', TWO_YEAR: '2nd Year Results' };
const TABS: Array<{ scope: Scope; to: string; label: string }> = [
  { scope: 'all', to: '/admin/results', label: 'All' }, { scope: 'ONE_YEAR', to: '/admin/results/1-year', label: '1st Year' }, { scope: 'TWO_YEAR', to: '/admin/results/2-year', label: '2nd Year' },
];

export default function ResultsPage({ year }: { year: Scope }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<ResultQuery['sortBy']>>('submittedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<null | 'csv' | 'xlsx'>(null);
  const dSearch = useDebounce(search);
  const dStudent = useDebounce(studentId);

  useEffect(() => setPage(1), [dSearch, dStudent, examId, status, from, to, sortBy, order, year]);

  const exams = useAsync(() => examsApi.list(), []);
  const filters: ResultQuery = {
    search: dSearch || undefined, examId: examId || undefined, studentId: dStudent || undefined, status: status || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    sortBy, order,
  };
  const { data, loading, error, reload } = useAsync(
    () => adminApi.results(year, { ...filters, page, pageSize: PAGE_SIZE }),
    [year, dSearch, dStudent, examId, status, from, to, sortBy, order, page],
  );

  const onSort = (key: NonNullable<ResultQuery['sortBy']>) => {
    if (key === sortBy) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setOrder(key === 'name' ? 'asc' : 'desc'); }
  };
  const exportAs = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try { await download('/admin/results/export', { ...filters, year: year === 'all' ? undefined : year, format }, format === 'csv' ? 'results.csv' : 'results.xlsx'); toast('Export downloaded', 'success'); }
    catch (e) { toast(errorMessage(e, 'Export failed'), 'error'); } finally { setExporting(null); }
  };
  const clear = () => { setSearch(''); setExamId(''); setStudentId(''); setStatus(''); setFrom(''); setTo(''); };
  const dateInvalid = !!from && !!to && from > to;

  return (
    <div>
      <PageHeader title={TITLES[year]} subtitle="Review, filter and export exam results"
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting === 'csv'} disabled={!!exporting} onClick={() => void exportAs('csv')}>Export CSV</Button>
          <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === 'xlsx'} disabled={!!exporting} onClick={() => void exportAs('xlsx')}>Export Excel</Button>
        </>} />
      <nav aria-label="Result groups" className="mb-4 flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-soft">
        {TABS.map((t) => (
          <NavLink key={t.scope} to={t.to} end
            className={({ isActive }) => `flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-all duration-200 sm:flex-none ${isActive ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{t.label}</NavLink>
        ))}
      </nav>
      <Card padded={false}>
        <FilterBar>
          <div className="w-full sm:w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search student ID, name or exam" /></div>
          <div className="w-full sm:w-48">
            <Select label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">All exams</option>
              {(exams.data ?? []).filter((x) => year === 'all' || x.year === 'BOTH' || x.year === year).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-36"><Input label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
          <div className="w-full sm:w-40">
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option><option value="SUBMITTED">Submitted</option><option value="AUTO_SUBMITTED">Auto submitted</option><option value="EVALUATED">Evaluated</option>
            </Select>
          </div>
          <div className="w-full sm:w-40"><Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="w-full sm:w-40"><Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="w-full sm:w-40">
            <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="submittedAt">Submitted date</option><option value="marks">Marks</option><option value="percentage">Percentage</option><option value="name">Student name</option>
            </Select>
          </div>
          <div className="w-full sm:w-32">
            <Select label="Order" value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}><option value="desc">Descending</option><option value="asc">Ascending</option></Select>
          </div>
          <Button variant="ghost" onClick={clear}>Clear filters</Button>
        </FilterBar>
        {dateInvalid && <div className="p-4"><Alert tone="amber">The "From" date is after the "To" date.</Alert></div>}
        <ResultTable rows={data?.items} sortBy={sortBy} order={order} onSort={onSort} loading={loading} error={error} onRetry={reload} />
        {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </Card>
    </div>
  );
}
