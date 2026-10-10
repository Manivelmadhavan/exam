import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, Column, ConfirmDialog, FilterBar, PageHeader, SearchBar, Select, Table } from '../../components/ui';
import { Alert, Button } from '../../components/AdminBits';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { ApiError, errorMessage } from '../../services/api';
import { questionsApi } from '../../services/endpoints';
import type { Language, Question } from '../../types';
import { ALL_LANGUAGES, languageLabel } from '../../utils/format';

export default function QuestionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<'' | Language>('');
  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useAsync(() => questionsApi.list({ search: debounced || undefined, language: language || undefined }), [debounced, language]);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const close = () => { setDeleting(null); setDialogError(null); };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try { await questionsApi.remove(deleting.id); toast('Question deleted', 'success'); close(); reload(); }
    catch (e) {
      setDialogError(e instanceof ApiError && e.errorCode === 'QUESTION_IN_USE' ? `${errorMessage(e)} Remove it from those exams first.` : errorMessage(e));
    } finally { setBusy(false); }
  };

  const columns: Column<Question>[] = [
    { key: 'title', header: 'Title', render: (q) => <Link to={`/admin/questions/${q.id}/edit`} className="font-medium text-brand-700 hover:underline">{q.title}</Link> },
    { key: 'marks', header: 'Marks', render: (q) => q.marks },
    { key: 'languages', header: 'Languages', render: (q) => <div className="flex flex-wrap gap-1">{q.allowedLanguages.map((l) => <Badge key={l} tone="blue">{languageLabel(l)}</Badge>)}</div> },
    { key: 'tests', header: 'Test cases', render: (q) => q._count?.testCases ?? 0 },
    { key: 'used', header: 'Used in exams', render: (q) => q._count?.examQuestions ?? 0 },
    {
      key: 'actions', header: 'Actions', render: (q) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" aria-label={`Edit ${q.title}`} title="Edit" onClick={() => navigate(`/admin/questions/${q.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={`Delete ${q.title}`} title="Delete" onClick={() => { setDeleting(q); setDialogError(null); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Questions" subtitle="Reusable coding problems with test cases" actions={<Link to="/admin/questions/create"><Button icon={<Plus className="h-4 w-4" />}>Create question</Button></Link>} />
      <Card padded={false}>
        <FilterBar>
          <div className="w-full sm:w-72"><SearchBar value={search} onChange={setSearch} placeholder="Search questions" /></div>
          <div className="w-40"><Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value as '' | Language)}>
            <option value="">All languages</option>{ALL_LANGUAGES.map((l) => <option key={l} value={l}>{languageLabel(l)}</option>)}</Select></div>
        </FilterBar>
        <Table columns={columns} rows={data} rowKey={(q) => q.id} loading={loading} error={error} onRetry={reload}
          emptyTitle={debounced || language ? 'No questions match your filters' : 'No questions yet'} emptyDescription={debounced || language ? undefined : 'Create your first question.'} />
      </Card>
      <ConfirmDialog open={!!deleting} loading={busy} danger onCancel={close} onConfirm={() => void remove()} title="Delete question?" confirmLabel="Delete"
        message={<><p>Delete "{deleting?.title}" and all its test cases? This cannot be undone.</p>{dialogError && <div className="mt-3"><Alert>{dialogError}</Alert></div>}</>} />
    </div>
  );
}
