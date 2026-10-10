import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginLimiter, runLimiter } from '../middleware/rateLimit';
import * as v from '../validators';
import * as authC from '../controllers/auth.controller';
import * as studentC from '../controllers/student.controller';
import * as examC from '../controllers/exam.controller';
import * as questionC from '../controllers/question.controller';
import * as studentExamC from '../controllers/studentExam.controller';
import * as attemptC from '../controllers/attempt.controller';
import * as resultC from '../controllers/result.controller';
import * as codeC from '../controllers/code.controller';
import * as feedbackC from '../controllers/feedback.controller';

const admin = [authenticate, requireRole('ADMIN')];
const student = [authenticate, requireRole('STUDENT')];
const api = Router();

api.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

/* auth */
api.post('/auth/admin/login', loginLimiter, validate(v.adminLoginSchema), authC.adminLogin);
api.post('/auth/student/login', loginLimiter, validate(v.studentLoginSchema), authC.studentLogin);
api.post('/auth/logout', authC.logout);
api.get('/auth/me', authenticate, authC.me);

/* students (admin) */
api.get('/students', ...admin, validate(v.studentListQuery, 'query'), studentC.listStudents);
api.post('/students', ...admin, validate(v.studentCreateSchema), studentC.createStudent);
api.get('/students/:id', ...admin, studentC.getStudent);
api.put('/students/:id', ...admin, validate(v.studentUpdateSchema), studentC.updateStudent);
api.delete('/students/:id', ...admin, studentC.deleteStudent);
api.patch('/students/:id/status', ...admin, validate(v.studentStatusSchema), studentC.setStudentStatus);
api.patch('/students/:id/password', ...admin, validate(v.studentPasswordSchema), studentC.resetStudentPassword);

/* exams (admin) */
api.get('/exams', ...admin, examC.listExams);
api.post('/exams', ...admin, validate(v.examBodySchema), examC.createExam);
api.get('/exams/:id', ...admin, examC.getExam);
api.get('/exams/:id/preview', ...admin, examC.previewExam);
api.put('/exams/:id', ...admin, validate(v.examBodySchema), examC.updateExam);
api.delete('/exams/:id', ...admin, examC.deleteExam);
api.patch('/exams/:id/publish', ...admin, validate(v.examPublishSchema), examC.publishExam);
api.patch('/exams/:id/close', ...admin, examC.closeExam);
api.patch('/exams/:id/reopen', ...admin, examC.reopenExam);

/* questions + test cases (admin) */
api.get('/questions', ...admin, validate(v.questionListQuery, 'query'), questionC.listQuestions);
api.post('/questions', ...admin, validate(v.questionBodySchema), questionC.createQuestion);
api.get('/questions/:id', ...admin, questionC.getQuestion);
api.put('/questions/:id', ...admin, validate(v.questionBodySchema), questionC.updateQuestion);
api.delete('/questions/:id', ...admin, questionC.deleteQuestion);
api.get('/questions/:questionId/testcases', ...admin, questionC.listTestCases);
api.post('/questions/:questionId/testcases', ...admin, validate(v.testCaseSchema), questionC.createTestCase);
api.put('/testcases/:id', ...admin, validate(v.testCaseSchema), questionC.updateTestCase);
api.delete('/testcases/:id', ...admin, questionC.deleteTestCase);

/* student exams + results */
api.get('/student/exams', ...student, studentExamC.listStudentExams);
api.get('/student/exams/:examId', ...student, studentExamC.getStudentExam);
api.post('/student/exams/:examId/start', ...student, studentExamC.startStudentExam);
api.get('/student/results', ...student, resultC.listMyResults);
api.get('/student/results/:id', ...student, resultC.getMyResult);

/* attempts (student only) */
api.get('/attempts/:id', ...student, attemptC.getAttempt);
api.put('/attempts/:id/code', ...student, validate(v.codeSaveSchema), attemptC.saveCode);
api.post('/attempts/:id/run', ...student, runLimiter, validate(v.runSchema), attemptC.runCode);
api.post('/attempts/:id/questions/:questionId/submit', ...student, runLimiter, validate(v.submitQuestionSchema), attemptC.submitQuestion);
api.post('/attempts/:id/submit', ...student, attemptC.submitExam);
api.post('/attempts/:id/violations', ...student, validate(v.violationSchema), attemptC.recordViolation);

/* admin results */
api.get('/admin/dashboard', ...admin, resultC.getDashboard);
api.get('/admin/results', ...admin, validate(v.resultsQuery, 'query'), resultC.listAllResults);
api.get('/admin/results/1-year', ...admin, validate(v.resultsQuery, 'query'), resultC.listOneYearResults);
api.get('/admin/results/2-year', ...admin, validate(v.resultsQuery, 'query'), resultC.listTwoYearResults);
api.get('/admin/results/export', ...admin, validate(v.resultsQuery, 'query'), resultC.exportResults);
api.get('/admin/results/:id', ...admin, resultC.getAdminResult);
api.get('/admin/attempts/:id/violations', ...admin, resultC.getAttemptViolations);
api.get('/admin/violations', ...admin, validate(v.violationsQuery, 'query'), resultC.listViolations);
api.post('/admin/attempts/:id/reopen', ...admin, attemptC.reopenAttempt);

/* admin sandbox */
api.post('/code/run', ...admin, runLimiter, validate(v.adminRunSchema), codeC.runCode);

/* feedback */
api.get('/feedback/mine', ...student, feedbackC.getMySubmission);
api.post('/feedback', ...student, validate(v.feedbackBodySchema), feedbackC.submitFeedback);
api.get('/admin/feedback', ...admin, feedbackC.listFeedback);

export default api;
