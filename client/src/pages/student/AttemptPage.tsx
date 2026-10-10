import { useParams } from 'react-router-dom';
import ExamWorkspace from '../../features/exam/ExamWorkspace';

export default function AttemptPage() {
  const { attemptId = '' } = useParams();
  return <ExamWorkspace mode="attempt" attemptId={attemptId} />;
}
