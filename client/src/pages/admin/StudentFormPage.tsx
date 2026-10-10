import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentForm } from '../../components/StudentForm';
import { Card, ErrorState, LoadingSpinner, PageHeader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { errorMessage } from '../../services/api';
import { studentsApi } from '../../services/endpoints';
import { Link } from 'react-router-dom';

export default function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, reload } = useAsync(() => (id ? studentsApi.get(id) : Promise.resolve(undefined)), [id]);

  const submit = async (values: Record<string, unknown>) => {
    try {
      if (id) await studentsApi.update(id, values); else await studentsApi.create(values);
      toast(id ? 'Student updated' : 'Student registered', 'success');
      navigate('/admin/students');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/students" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to students</Link>
      <PageHeader title={id ? 'Edit student' : 'Register student'} subtitle={id ? 'Update student details. Passwords are reset from the students list.' : 'Create a student account that can sign in with the Student ID and password.'} />
      <Card>
        {id && loading ? <LoadingSpinner /> : id && (error || !data) ? <ErrorState message={error ?? 'Student not found'} onRetry={reload} />
          : <StudentForm student={data} onSubmit={submit} onCancel={() => navigate('/admin/students')} />}
      </Card>
    </div>
  );
}
