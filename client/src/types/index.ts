export type Role = 'ADMIN' | 'STUDENT';
export type Year = 'ONE_YEAR' | 'TWO_YEAR';
export type ExamYear = Year | 'BOTH';
export type Language = 'PYTHON' | 'JAVA' | 'CPP';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'EVALUATED';
export type SubmissionStatus =
  | 'NOT_ATTEMPTED' | 'DRAFT' | 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED';
export type ViolationType = 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 'CUT_ATTEMPT' | 'RIGHT_CLICK' | 'PAGE_LEAVE';

export interface AuthUser {
  id: string; role: Role; name: string;
  username?: string; email?: string | null; studentId?: string; year?: Year;
  phone?: string | null; department?: string | null; batch?: string | null; rollNumber?: string | null;
}

export interface Student {
  id: string; studentId: string; name: string; year: Year; email: string | null; phone: string | null;
  department: string | null; batch: string | null; rollNumber: string | null;
  status: 'ACTIVE' | 'INACTIVE'; createdAt: string; updatedAt: string;
  _count?: { attempts: number; results: number };
}
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number }

export interface TestCase { id?: string; questionId?: string; input: string; expectedOutput: string; isSample: boolean; weight: number }
export interface Question {
  id: string; title: string; problemStatement: string; inputFormat: string; outputFormat: string; constraints: string;
  explanation: string; sampleInput: string; sampleOutput: string; marks: number; timeLimitMs: number; memoryLimitMb: number;
  orderNumber: number; allowedLanguages: Language[]; createdAt: string; updatedAt: string;
  testCases?: TestCase[]; _count?: { testCases: number; examQuestions: number };
}

export interface ExamSettings {
  fullscreenRequired: boolean; disableCopyPaste: boolean; disableRightClick: boolean; tabSwitchDetection: boolean;
  maxViolations: number; autoSubmit: boolean; showVerdict: boolean;
}
export interface Exam extends Omit<ExamSettings, 'autoSubmit' | 'showVerdict'> {
  id: string; title: string; description: string; instructions: string; year: ExamYear; durationMinutes: number;
  totalMarks: number; startDateTime: string; endDateTime: string; status: ExamStatus;
  autoSubmit: boolean; scoringMode: 'PROPORTIONAL' | 'FULL_MARKS'; submissionPolicy: 'LATEST' | 'BEST';
  showVerdict: boolean; strictWhitespace: boolean; languages: Language[]; questionCount?: number; attemptCount?: number;
  questions?: Array<{ id: string; questionId: string; questionNumber: number; marks: number; question: Question }>;
}

/* student-facing */
export type Availability = 'UPCOMING' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
export interface StudentExamCard {
  id: string; title: string; description: string; year: ExamYear; durationMinutes: number; questionCount: number;
  totalMarks: number; startDateTime: string; endDateTime: string; availability: Availability;
  attemptId: string | null; resultId: string | null;
}
export interface StudentExamOverview extends StudentExamCard {
  instructions: string; allowedLanguages: Language[]; settings: ExamSettings;
}

export type QuestionState = 'NOT_ATTEMPTED' | 'ATTEMPTED' | 'SUBMITTED';
export interface ExamQuestionView {
  id: string; questionNumber: number; marks: number; title: string; problemStatement: string; inputFormat: string;
  outputFormat: string; constraints: string; explanation: string; sampleInput: string; sampleOutput: string;
  allowedLanguages: Language[]; timeLimitMs: number; memoryLimitMb: number;
  sampleTests: Array<{ id: string; input: string; expectedOutput: string }>;
  submission: null | {
    language: Language; sourceCode: string; state: QuestionState;
    verdict?: SubmissionStatus; obtainedMarks?: number; passedTestCases?: number; totalTestCases?: number;
  };
}
export interface ExamSummary {
  id: string; title: string; description: string; instructions: string; year: ExamYear; durationMinutes: number;
  totalMarks: number; questionCount: number; startDateTime: string; endDateTime: string; status: ExamStatus;
  languages: Language[]; settings: ExamSettings;
}
export interface AttemptView {
  serverTime: string; remainingSeconds: number;
  attempt: { id: string; status: AttemptStatus; startedAt: string; expiresAt: string; submittedAt: string | null; autoSubmitted: boolean; resultId: string | null };
  exam: ExamSummary; student: { studentId: string; name: string }; questions: ExamQuestionView[];
}
export interface PreviewView { preview: true; exam: ExamSummary; allowedLanguages: Language[]; questions: ExamQuestionView[] }

export interface RunCustomResult { mode: 'custom'; status: 'SUCCESS' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED'; output: string; errorMessage?: string; compilerMessage?: string; executionTimeMs: number }
export interface RunSamplesResult {
  mode: 'samples';
  results: Array<{ input: string; expectedOutput: string; output: string; status: string; passed: boolean; executionTimeMs: number; errorMessage?: string; compilerMessage?: string }>;
}
export type RunResult = RunCustomResult | RunSamplesResult;
export interface SubmitQuestionResult {
  submitted: boolean; state: 'SUBMITTED'; verdict?: SubmissionStatus; obtainedMarks?: number; maxMarks?: number;
  passedTestCases?: number; totalTestCases?: number; executionTimeMs?: number | null;
}

/* results */
export interface ResultRow {
  id: string; studentId: string; studentName: string; year: Year; examId: string; examTitle: string;
  totalQuestions: number; attemptedCount: number; acceptedCount: number; obtainedMarks: number; totalMarks: number;
  percentage: number; timeTakenSeconds: number; submittedAt: string; status: AttemptStatus; autoSubmitted: boolean;
}
export interface ResultDetailRow {
  id: string; questionId: string; questionNumber: number; questionTitle: string; language: Language | null;
  status: SubmissionStatus; marks: number; maxMarks: number; passedTestCases: number; totalTestCases: number;
  executionTimeMs: number | null; sourceCode: string | null;
  executions?: Array<{ id: string; input: string; output: string; expectedOutput: string; status: string; executionTimeMs: number; compilerMessage: string | null; runtimeMessage: string | null }>;
}
export interface StudentResultFull {
  id: string; totalQuestions: number; totalMarks: number; obtainedMarks: number; percentage: number;
  attemptedCount: number; acceptedCount: number; wrongAnswerCount: number; unansweredCount: number;
  timeTakenSeconds: number; submittedAt: string;
  student: { studentId: string; name: string; year: Year };
  exam: { id: string; title: string; year: ExamYear; showVerdict: boolean };
  attempt: { status: AttemptStatus; autoSubmitted: boolean; startedAt: string };
  details: ResultDetailRow[];
}
export interface AdminResultFull extends Omit<StudentResultFull, 'student' | 'exam' | 'attempt'> {
  student: { id: string; studentId: string; name: string; year: Year; email: string | null; department: string | null; batch: string | null };
  exam: { id: string; title: string; year: ExamYear; durationMinutes: number };
  attempt: { id: string; status: AttemptStatus; startedAt: string; expiresAt: string; submittedAt: string | null; autoSubmitted: boolean; finalizeReason: string | null };
  violations: Array<{ id: string; type: ViolationType; details: string | null; createdAt: string }>;
}
export interface StudentResultListItem {
  id: string; examId: string; examTitle: string; submittedAt: string; obtainedMarks: number; totalMarks: number;
  percentage: number; status: AttemptStatus; autoSubmitted: boolean;
}
export interface DashboardData {
  cards: { totalStudents: number; oneYearStudents: number; twoYearStudents: number; totalExams: number; activeExams: number; completedExams: number; totalSubmissions: number; averageScore: number };
  charts: {
    perExam: Array<{ exam: string; participants: number; averageMarks: number; averagePercentage: number; oneYearAverage: number; twoYearAverage: number }>;
    yearPerformance: Array<{ year: string; averagePercentage: number; submissions: number }>;
  };
}
export interface AdminViolationEvent {
  id: string; type: ViolationType; details: string | null; createdAt: string;
  examId: string; examTitle: string; attemptId: string;
}
export interface AdminViolationAttempt {
  attemptId: string; examId: string; examTitle: string; durationMinutes: number;
  status: AttemptStatus; autoSubmitted: boolean; finalizeReason: string | null; canReopen: boolean;
}
export interface AdminViolationStudentGroup {
  student: { id: string; studentId: string; name: string; year: Year };
  total: number; attempts: AdminViolationAttempt[]; violations: AdminViolationEvent[];
}
export interface ViolationQuery {
  search?: string; year?: Year; examId?: string; type?: ViolationType; page?: number; pageSize?: number;
}
export interface ResultQuery {
  search?: string; examId?: string; studentId?: string; status?: string; from?: string; to?: string; year?: Year;
  sortBy?: 'marks' | 'percentage' | 'submittedAt' | 'name'; order?: 'asc' | 'desc'; page?: number; pageSize?: number;
}

export type FeedbackClassYear = '1st Year' | '2nd Year' | '3rd Year' | 'Other';
export type FeedbackIssue = 'No issues' | 'Login issues' | 'Code execution issues' | 'Slow performance' | 'Timer issues' | 'Submission or result issues' | 'Other';
export interface Feedback {
  id: string; studentName: string; studentId: string; classYear: string; language: string;
  loginEase: number; uiRating: number; problemReadability: string; codeEditorRating: number;
  runCodeWorks: string; inputOutputEase: string; timerVisible: string; timeSufficient: string;
  languageSupport: string; executionSpeed: number; resultsDisplayed: string; overallSatisfaction: number;
  likedMost: string | null; issuesSeen: string[]; improvements: string | null; useAgain: string;
  submittedById: string | null; createdAt: string;
}
export interface FeedbackPayload {
  studentName: string; studentId: string; classYear: string; language: string;
  loginEase: number; uiRating: number; problemReadability: string; codeEditorRating: number;
  runCodeWorks: string; inputOutputEase: string; timerVisible: string; timeSufficient: string;
  languageSupport: string; executionSpeed: number; resultsDisplayed: string; overallSatisfaction: number;
  likedMost?: string | null; issuesSeen: string[]; improvements?: string | null; useAgain: string;
}
