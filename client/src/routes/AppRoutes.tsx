import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import { LoadingSpinner } from '../components/ui';
import LandingPage from '../pages/LandingPage';
import StudentLoginPage from '../pages/auth/StudentLoginPage';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';

// Admin pages
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const StudentsPage = lazy(() => import('../pages/admin/StudentsPage'));
const StudentFormPage = lazy(() => import('../pages/admin/StudentFormPage'));
const ExamsPage = lazy(() => import('../pages/admin/ExamsPage'));
const ExamWizardPage = lazy(() => import('../pages/admin/ExamWizardPage'));
const ExamPreviewPage = lazy(() => import('../pages/admin/ExamPreviewPage'));
const QuestionsPage = lazy(() => import('../pages/admin/QuestionsPage'));
const QuestionFormPage = lazy(() => import('../pages/admin/QuestionFormPage'));
const ResultsPage = lazy(() => import('../pages/admin/ResultsPage'));
const AdminResultDetailPage = lazy(() => import('../pages/admin/ResultDetailPage'));
const AdminViolationsPage = lazy(() => import('../pages/admin/ViolationsPage'));
const AdminFeedbackPage = lazy(() => import('../pages/admin/FeedbackPage'));
// Student pages
const StudentDashboardPage = lazy(() => import('../pages/student/StudentDashboardPage'));
const StudentExamsPage = lazy(() => import('../pages/student/StudentExamsPage'));
const ExamOverviewPage = lazy(() => import('../pages/student/ExamOverviewPage'));
const ExamStartPage = lazy(() => import('../pages/student/ExamStartPage'));
const AttemptPage = lazy(() => import('../pages/student/AttemptPage'));
const StudentResultsPage = lazy(() => import('../pages/student/StudentResultsPage'));
const StudentResultPage = lazy(() => import('../pages/student/StudentResultPage'));
const StudentFeedbackPage = lazy(() => import('../pages/student/FeedbackFormPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student1" element={<StudentLoginPage />} />
        <Route path="/admin1" element={<AdminLoginPage />} />

        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/create" element={<StudentFormPage />} />
          <Route path="students/:id/edit" element={<StudentFormPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/create" element={<ExamWizardPage />} />
          <Route path="exams/:id" element={<ExamWizardPage />} />
          <Route path="exams/:id/questions" element={<ExamWizardPage initialStep={1} />} />
          <Route path="exams/:id/preview" element={<ExamPreviewPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="questions/create" element={<QuestionFormPage />} />
          <Route path="questions/:id/edit" element={<QuestionFormPage />} />
          <Route path="results" element={<ResultsPage year="all" />} />
          <Route path="results/1-year" element={<ResultsPage year="ONE_YEAR" />} />
          <Route path="results/2-year" element={<ResultsPage year="TWO_YEAR" />} />
          <Route path="results/:id" element={<AdminResultDetailPage />} />
          <Route path="violations" element={<AdminViolationsPage />} />
          <Route path="feedback" element={<AdminFeedbackPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/student" element={<ProtectedRoute role="STUDENT"><AppLayout /></ProtectedRoute>}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="exams/:examId" element={<ExamOverviewPage />} />
          <Route path="exams/:examId/start" element={<ExamStartPage />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="results/:resultId" element={<StudentResultPage />} />
          <Route path="feedback" element={<StudentFeedbackPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* Full-screen exam interface: no sidebar */}
        <Route path="/student/attempt/:attemptId" element={<ProtectedRoute role="STUDENT"><AttemptPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
