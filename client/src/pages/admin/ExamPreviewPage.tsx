import { ArrowLeft, Eye } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import * as Workspace from '../../features/exam/ExamWorkspace';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ExamWorkspace: any = (Workspace as any).ExamWorkspace ?? (Workspace as any).default;

export default function ExamPreviewPage() {
  const { id } = useParams();
  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col sm:-m-6">
      <div className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-2 text-sm text-amber-900">
        <span aria-hidden className="absolute right-8 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-amber-200/60" />
        <span role="status"><Eye className="mr-1.5 inline h-4 w-4" aria-hidden />Preview mode - no attempt is created</span>
        <Link to={id ? `/admin/exams/${id}` : '/admin/exams'} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to exam</Link>
      </div>
      <div className="flex-1">{id && <ExamWorkspace mode="preview" examId={id} />}</div>
    </div>
  );
}
