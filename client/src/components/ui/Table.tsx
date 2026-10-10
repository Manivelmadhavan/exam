import { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from './Button';
import { EmptyState, ErrorState, LoadingSpinner } from './Feedback';

export interface Column<T> { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string }

export function Table<T>({ columns, rows, rowKey, loading, error, onRetry, emptyTitle = 'No records found', emptyDescription }: {
  columns: Column<T>[]; rows: T[] | undefined; rowKey: (row: T) => string; loading?: boolean; error?: string | null;
  onRetry?: () => void; emptyTitle?: string; emptyDescription?: string;
}) {
  if (loading && !rows) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className={clsx('overflow-x-auto', loading && 'opacity-60')}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-gradient-to-r from-brand-600/5 via-transparent to-accent-600/5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={clsx('px-4 py-3.5', c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="table-row relative">
              {columns.map((c) => <td key={c.key} className={clsx('px-4 py-3.5 align-middle', c.className)}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
      <span>Showing <strong>{from}-{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong></span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="px-1 font-medium">Page <strong>{page}</strong> / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('group relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" aria-hidden />
      <input type="search" aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-10" />
    </div>
  );
}

export const FilterBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/40 p-4">{children}</div>
);