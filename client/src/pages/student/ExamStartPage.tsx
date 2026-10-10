import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { studentExamsApi } from '../../services/endpoints';
import { ApiError, errorMessage } from '../../services/api';
import { Button, ErrorState, LoadingSpinner } from '../../components/ui';

export default function ExamStartPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const started = useRef(false); // StrictMode runs effects twice in dev; the API must be called once
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    studentExamsApi.start(examId)
      .then((r) => navigate(`/student/attempt/${r.attemptId}`, { replace: true }))
      .catch((e) => setError({ message: errorMessage(e), code: e instanceof ApiError ? e.errorCode : undefined }));
  }, [examId, navigate, attempt]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <ErrorState message={error.message} onRetry={error.code === 'RUNNER_UNAVAILABLE' ? undefined : () => { started.current = false; setError(null); setAttempt((n) => n + 1); }} />
        <div className="flex justify-center gap-3">
          {error.code === 'ALREADY_ATTEMPTED' && <Link to="/student/results"><Button>Go to My Results</Button></Link>}
          <Link to="/student/exams"><Button variant="secondary">Back to exams</Button></Link>
        </div>
      </div>
    );
  }
  return <LoadingSpinner className="min-h-[50vh]" label="Preparing your exam workspace..." />;
}