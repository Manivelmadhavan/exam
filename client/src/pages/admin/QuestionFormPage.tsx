import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QuestionForm } from '../../components/QuestionForm';
import { ErrorState, LoadingSpinner, PageHeader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { questionsApi } from '../../services/endpoints';

export default function QuestionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, reload } = useAsync(() => (id ? questionsApi.get(id) : Promise.resolve(undefined)), [id]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/questions" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to questions</Link>
      <PageHeader title={id ? 'Edit question' : 'Create question'} subtitle={id ? 'Test case changes are saved immediately; use "Save question" for the other fields.' : 'Define the problem, limits and test cases.'} />
      {id && loading ? <LoadingSpinner /> : id && (error || !data) ? <ErrorState message={error ?? 'Question not found'} onRetry={reload} /> : (
        <QuestionForm question={data} onCancel={() => navigate('/admin/questions')}
          onSubmit={async (v, testCases) => {
            if (id) {
              await questionsApi.update(id, v);
              toast('Question saved', 'success');
              reload();
            } else {
              await questionsApi.create({ ...v, testCases: testCases.map(({ input, expectedOutput, isSample, weight }) => ({ input, expectedOutput, isSample, weight })) });
              toast('Question created', 'success');
              navigate('/admin/questions');
            }
          }} />
      )}
    </div>
  );
}
