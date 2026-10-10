import { del, get, patch, post, put } from './api';
import type {
  AdminResultFull, AdminViolationStudentGroup, AttemptView, AuthUser, DashboardData, Exam, Feedback, FeedbackPayload, PreviewView, Paginated, Question, ResultQuery, ResultRow,
  RunResult, Student, StudentExamCard, StudentExamOverview, StudentResultFull, StudentResultListItem, SubmitQuestionResult, TestCase,
  Language, ViolationQuery, ViolationType, Year,
} from '../types';

export const authApi = {
  adminLogin: (identifier: string, password: string) => post<{ user: AuthUser }>('/auth/admin/login', { identifier, password }),
  studentLogin: (studentId: string, password: string) => post<{ user: AuthUser }>('/auth/student/login', { studentId, password }),
  logout: () => post<{ loggedOut: boolean }>('/auth/logout'),
  me: () => get<{ user: AuthUser }>('/auth/me'),
};

export const studentsApi = {
  list: (params: { search?: string; year?: Year; status?: string; page?: number; pageSize?: number }) => get<Paginated<Student>>('/students', params),
  get: (id: string) => get<Student>(`/students/${id}`),
  create: (body: unknown) => post<Student>('/students', body),
  update: (id: string, body: unknown) => put<Student>(`/students/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/students/${id}`),
  setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => patch<Student>(`/students/${id}/status`, { status }),
  resetPassword: (id: string, password: string) => patch<{ reset: boolean }>(`/students/${id}/password`, { password }),
};

export const questionsApi = {
  list: (params?: { search?: string; language?: Language }) => get<Question[]>('/questions', params),
  get: (id: string) => get<Question>(`/questions/${id}`),
  create: (body: unknown) => post<Question>('/questions', body),
  update: (id: string, body: unknown) => put<Question>(`/questions/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/questions/${id}`),
  listTests: (qid: string) => get<TestCase[]>(`/questions/${qid}/testcases`),
  addTest: (qid: string, body: Omit<TestCase, 'id'>) => post<TestCase>(`/questions/${qid}/testcases`, body),
  updateTest: (id: string, body: Omit<TestCase, 'id'>) => put<TestCase>(`/testcases/${id}`, body),
  removeTest: (id: string) => del<{ deleted: boolean }>(`/testcases/${id}`),
};

export const examsApi = {
  list: () => get<Exam[]>('/exams'),
  get: (id: string) => get<Exam>(`/exams/${id}`),
  create: (body: unknown) => post<Exam>('/exams', body),
  update: (id: string, body: unknown) => put<Exam>(`/exams/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/exams/${id}`),
  publish: (id: string, published = true) => patch<Exam>(`/exams/${id}/publish`, { published }),
  close: (id: string) => patch<Exam>(`/exams/${id}/close`),
  reopen: (id: string) => patch<Exam>(`/exams/${id}/reopen`),
  preview: (id: string) => get<PreviewView>(`/exams/${id}/preview`),
};

export const adminApi = {
  dashboard: () => get<DashboardData>('/admin/dashboard'),
  results: (scope: 'all' | 'ONE_YEAR' | 'TWO_YEAR', params: ResultQuery) =>
    get<Paginated<ResultRow>>(scope === 'all' ? '/admin/results' : scope === 'ONE_YEAR' ? '/admin/results/1-year' : '/admin/results/2-year', params),
  result: (id: string) => get<AdminResultFull>(`/admin/results/${id}`),
  violations: (params: ViolationQuery) => get<Paginated<AdminViolationStudentGroup>>('/admin/violations', params),
  reopenAttempt: (attemptId: string) =>
    post<{ attemptId: string; examId: string; examTitle: string; status: string; expiresAt: string; durationMinutes: number }>(`/admin/attempts/${attemptId}/reopen`),
  run: (body: { language: Language; sourceCode: string; input: string; timeLimitMs?: number; memoryLimitMb?: number }) =>
    post<{ status: string; output: string; executionTimeMs: number; compilerMessage?: string; errorMessage?: string }>('/code/run', body),
  feedback: () => get<Feedback[]>('/admin/feedback'),
};

export const feedbackApi = {
  mine: () => get<{ submitted: boolean; submittedAt?: string }>('/feedback/mine'),
  submit: (body: FeedbackPayload) => post<{ id: string; submittedAt: string }>('/feedback', body),
};

export const studentExamsApi = {
  list: () => get<StudentExamCard[]>('/student/exams'),
  get: (examId: string) => get<StudentExamOverview>(`/student/exams/${examId}`),
  start: (examId: string) => post<{ attemptId: string; resumed: boolean }>(`/student/exams/${examId}/start`),
  results: () => get<StudentResultListItem[]>('/student/results'),
  result: (id: string) => get<StudentResultFull>(`/student/results/${id}`),
};

export const attemptsApi = {
  get: (id: string) => get<AttemptView>(`/attempts/${id}`),
  saveCode: (id: string, items: Array<{ questionId: string; language: Language; sourceCode: string }>) =>
    put<{ savedAt: string; remainingSeconds: number }>(`/attempts/${id}/code`, { items }),
  run: (id: string, body: { questionId: string; language: Language; sourceCode: string; input?: string; mode: 'custom' | 'samples' }) =>
    post<RunResult>(`/attempts/${id}/run`, body),
  submitQuestion: (id: string, questionId: string, language: Language, sourceCode: string) =>
    post<SubmitQuestionResult>(`/attempts/${id}/questions/${questionId}/submit`, { language, sourceCode }),
  submitExam: (id: string) => post<{ resultId: string; autoSubmitted: boolean; status: string }>(`/attempts/${id}/submit`),
  violation: (id: string, type: ViolationType, details?: string) =>
    post<{ count: number; max: number; autoSubmitted: boolean; resultId?: string }>(`/attempts/${id}/violations`, { type, details }),
};
