import { BarChart3, Eye, Lock, Pencil, Plus, RotateCcw, Send, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button } from '../../components/AdminBits';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, LoadingSpinner, PageHeader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { errorMessage } from '../../services/api';
import { examsApi } from '../../services/endpoints';
import type { Exam, ExamStatus } from '../../types';
import { formatDateTime, languageLabel, yearLabel } from '../../utils/format';

type Action = 'publish' | 'unpublish' | 'close' | 'reopen' | 'delete';
const tone: Record<ExamStatus, 'gray' | 'green' | 'amber'> = { DRAFT: 'gray', PUBLISHED: 'green', CLOSED: 'amber' };
const copy: Record<Action, { title: string; label: string; danger?: boolean; text: (e: Exam) => string; done: string }> = {
  publish: { title: 'Publish exam?', label: 'Publish', text: (e) => `"${e.title}" becomes visible to ${yearLabel(e.year)} students during its time window.`, done: 'Exam published' },
  unpublish: { title: 'Unpublish exam?', label: 'Unpublish', text: (e) => `"${e.title}" returns to draft and is hidden from students. Not possible once students have started.`, done: 'Exam moved to draft' },
  close: { title: 'Close exam?', label: 'Close', danger: true, text: (e) => `No student will be able to start or continue "${e.title}" after it is closed.`, done: 'Exam closed' },
  reopen: { title: 'Reopen exam?', label: 'Reopen', text: (e) => `"${e.title}" becomes available to students again during its time window.`, done: 'Exam reopened' },
  delete: { title: 'Delete exam?', label: 'Delete', danger: true, text: (e) => `Permanently delete "${e.title}"? All of its attempts, results and submissions are deleted too. Questions in your library are kept. This cannot be undone.`, done: 'Exam deleted' },
};

export default function ExamsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useAsync(() => examsApi.list(), []);
  const [pending, setPending] = useState<{ exam: Exam; action: Action } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const close = () => { setPending(null); setDialogError(null); };
  const confirm = async () => {
    if (!pending) return;
    const { exam, action } = pending;
    setBusy(true); setDialogError(null);
    try {
      if (action === 'publish') await examsApi.publish(exam.id, true);
      else if (action === 'unpublish') await examsApi.publish(exam.id, false);
      else if (action === 'close') await examsApi.close(exam.id);
      else if (action === 'reopen') await examsApi.reopen(exam.id);
      else await examsApi.remove(exam.id);
      toast(copy[action].done, 'success'); close(); reload();
    } catch (e) { setDialogError(errorMessage(e)); } finally { setBusy(false); }
  };
  const ask = (exam: Exam, action: Action) => { setPending({ exam, action }); setDialogError(null); };

  return (
    <div>
      <PageHeader title="Exams" subtitle="Create, publish and monitor exams" actions={<Link to="/admin/exams/create"><Button icon={<Plus className="h-4 w-4" />}>Create exam</Button></Link>} />
      {loading && !data ? <LoadingSpinner /> : error || !data ? <ErrorState message={error ?? 'Could not load exams'} onRetry={reload} /> : data.length === 0 ? (
        <Card><EmptyState title="No exams yet" description="Create your first exam to get started." action={<Link to="/admin/exams/create"><Button>Create exam</Button></Link>} /></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {data.map((e) => (
            <li key={e.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{e.title}</h2>
                <Badge tone={tone[e.status]}>{e.status.charAt(0) + e.status.slice(1).toLowerCase()}</Badge>
              </div>
              {e.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{e.description}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-xs text-slate-500">Year</dt><dd>{yearLabel(e.year)}</dd></div>
                <div><dt className="text-xs text-slate-500">Duration</dt><dd>{e.durationMinutes} min</dd></div>
                <div><dt className="text-xs text-slate-500">Questions</dt><dd>{e.questionCount ?? 0}</dd></div>
                <div><dt className="text-xs text-slate-500">Total marks</dt><dd>{e.totalMarks}</dd></div>
                <div><dt className="text-xs text-slate-500">Attempts</dt><dd>{e.attemptCount ?? 0}</dd></div>
                <div><dt className="text-xs text-slate-500">Languages</dt><dd>{e.languages.map(languageLabel).join(', ')}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-slate-500">Window</dt><dd>{formatDateTime(e.startDateTime)} - {formatDateTime(e.endDateTime)}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link to={`/admin/exams/${e.id}`}><Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />}>Edit</Button></Link>
                <Link to={`/admin/exams/${e.id}/preview`}><Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />}>Preview</Button></Link>
                {e.status === 'DRAFT' && <Button size="sm" icon={<Send className="h-4 w-4" />} onClick={() => ask(e, 'publish')}>Publish</Button>}
                {e.status === 'PUBLISHED' && <Button size="sm" variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => ask(e, 'unpublish')}>Unpublish</Button>}
                {e.status === 'PUBLISHED' && <Button size="sm" variant="secondary" icon={<Lock className="h-4 w-4" />} onClick={() => ask(e, 'close')}>Close</Button>}
                {e.status === 'CLOSED' && <Button size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => ask(e, 'reopen')}>Reopen</Button>}
                <Link to={`/admin/results?examId=${e.id}`}><Button size="sm" variant="ghost" icon={<BarChart3 className="h-4 w-4" />}>View results</Button></Link>
                <Button size="sm" variant="ghost" className="ml-auto" aria-label={`Delete ${e.title}`} onClick={() => ask(e, 'delete')}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!pending} loading={busy} danger={pending ? copy[pending.action].danger : false} onCancel={close} onConfirm={() => void confirm()}
        title={pending ? copy[pending.action].title : ''} confirmLabel={pending ? copy[pending.action].label : 'Confirm'}
        message={pending && <><p>{copy[pending.action].text(pending.exam)}</p>{dialogError && <div className="mt-3"><Alert>{dialogError}</Alert></div>}</>} />
    </div>
  );
}
