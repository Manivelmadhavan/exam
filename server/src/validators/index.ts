import { z } from 'zod';
import { parseLanguage } from '../config/languages';

const optionalText = z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null));
export const languageSchema = z.preprocess(
  (v) => parseLanguage(v) ?? v,
  z.enum(['PYTHON', 'JAVA', 'CPP'], { errorMap: () => ({ message: 'Unsupported language' }) }),
);

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required').max(200),
  password: z.string().min(1, 'Password is required').max(200),
});
export const studentLoginSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required').max(50),
  password: z.string().min(1, 'Password is required').max(200),
});

const yearEnum = z.enum(['ONE_YEAR', 'TWO_YEAR']);
const passwordRule = z.string().min(6, 'Password must be at least 6 characters').max(100);

export const studentCreateSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required').max(50).regex(/^[A-Za-z0-9._-]+$/, 'Only letters, numbers, . _ - allowed'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  password: passwordRule,
  year: yearEnum,
  email: z.string().trim().email('Invalid email').max(200).optional().nullable().or(z.literal('')).transform((v) => v || null),
  phone: optionalText, department: optionalText, batch: optionalText, rollNumber: optionalText,
});
export const studentUpdateSchema = studentCreateSchema.omit({ password: true, studentId: true }).extend({
  studentId: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9._-]+$/).optional(),
});
export const studentStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });
export const studentPasswordSchema = z.object({ password: passwordRule });
export const studentListQuery = z.object({
  search: z.string().trim().optional(),
  year: yearEnum.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

const dateField = z.coerce.date();
export const examBodySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).default(''),
  year: z.enum(['ONE_YEAR', 'TWO_YEAR', 'BOTH']),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  instructions: z.string().max(10000).default(''),
  startDateTime: dateField,
  endDateTime: dateField,
  fullscreenRequired: z.boolean().default(false),
  disableCopyPaste: z.boolean().default(true),
  disableRightClick: z.boolean().default(true),
  tabSwitchDetection: z.boolean().default(true),
  maxViolations: z.coerce.number().int().min(0).max(100).default(0),
  autoSubmit: z.boolean().default(true),
  scoringMode: z.enum(['PROPORTIONAL', 'FULL_MARKS']).default('PROPORTIONAL'),
  submissionPolicy: z.enum(['LATEST', 'BEST']).default('BEST'),
  showVerdict: z.boolean().default(true),
  strictWhitespace: z.boolean().default(false),
  languages: z.array(languageSchema).min(1, 'Select at least one language').default(['PYTHON', 'JAVA', 'CPP']).transform((a) => [...new Set(a)]),
  questions: z.array(z.object({ questionId: z.string().min(1), marks: z.coerce.number().min(0).max(1000).optional() })).max(100).optional(),
}).refine((v) => v.endDateTime > v.startDateTime, { message: 'End time must be after start time', path: ['endDateTime'] });
export const examPublishSchema = z.object({ published: z.boolean().default(true) });

export const testCaseSchema = z.object({
  input: z.string().max(65536).default(''),
  expectedOutput: z.string().max(65536),
  isSample: z.boolean().default(false),
  weight: z.coerce.number().int().min(1).max(1000).default(1),
});
export const questionBodySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  problemStatement: z.string().min(1, 'Problem statement is required').max(20000),
  inputFormat: z.string().max(5000).default(''),
  outputFormat: z.string().max(5000).default(''),
  constraints: z.string().max(5000).default(''),
  explanation: z.string().max(5000).default(''),
  sampleInput: z.string().max(10000).default(''),
  sampleOutput: z.string().max(10000).default(''),
  marks: z.coerce.number().min(0).max(1000).default(10),
  timeLimitMs: z.coerce.number().int().min(100).max(10000).default(2000),
  memoryLimitMb: z.coerce.number().int().min(16).max(1024).default(256),
  orderNumber: z.coerce.number().int().min(0).default(0),
  allowedLanguages: z.array(languageSchema).min(1, 'Select at least one language').transform((a) => [...new Set(a)]),
  testCases: z.array(testCaseSchema).max(100).optional(),
});
export const questionListQuery = z.object({
  search: z.string().trim().optional(),
  language: languageSchema.optional(),
});

export const codeSaveSchema = z.object({
  items: z.array(z.object({
    questionId: z.string().min(1),
    language: languageSchema,
    sourceCode: z.string().max(65536),
  })).min(1).max(100),
});
export const runSchema = z.object({
  questionId: z.string().min(1),
  language: languageSchema,
  sourceCode: z.string().min(1, 'Write some code first').max(65536),
  input: z.string().max(65536).default(''),
  mode: z.enum(['custom', 'samples']).default('custom'),
});
export const adminRunSchema = z.object({
  language: languageSchema,
  sourceCode: z.string().min(1).max(65536),
  input: z.string().max(65536).default(''),
  timeLimitMs: z.coerce.number().int().min(100).max(10000).optional(),
  memoryLimitMb: z.coerce.number().int().min(16).max(1024).optional(),
});
export const submitQuestionSchema = z.object({
  language: languageSchema,
  sourceCode: z.string().max(65536),
});
export const violationSchema = z.object({
  type: z.enum(['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'RIGHT_CLICK', 'PAGE_LEAVE']),
  details: z.string().max(500).optional(),
});
export const resultsQuery = z.object({
  search: z.string().trim().optional(),
  year: yearEnum.optional(),
  examId: z.string().optional(),
  studentId: z.string().trim().optional(),
  status: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(['marks', 'percentage', 'submittedAt', 'name']).default('submittedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(15),
  format: z.enum(['csv', 'xlsx']).optional(),
});
export const violationsQuery = z.object({
  search: z.string().trim().optional(),
  year: yearEnum.optional(),
  examId: z.string().optional(),
  type: z.enum(['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'RIGHT_CLICK', 'PAGE_LEAVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

const feedbackText = z.string().trim().max(5000).default('').transform((v) => (v ? v : null));
const feedbackScale = z.coerce.number().int().min(1).max(5);
export const feedbackBodySchema = z.object({
  studentName: z.string().trim().min(1, 'Student name is required').max(120),
  studentId: z.string().trim().min(1, 'Student ID is required').max(50),
  classYear: z.enum(['1st Year', '2nd Year', '3rd Year', 'Other']),
  language: z.enum(['Java', 'Python', 'C++']),
  loginEase: feedbackScale,
  uiRating: feedbackScale,
  problemReadability: z.enum(['Very Easy', 'Easy', 'Average', 'Difficult']),
  codeEditorRating: feedbackScale,
  runCodeWorks: z.enum(['Yes, perfectly', 'Yes, but with some issues', 'No', 'I did not use this feature']),
  inputOutputEase: z.enum(['Very Easy', 'Easy', 'Average', 'Difficult']),
  timerVisible: z.enum(['Yes', 'Partially', 'No']),
  timeSufficient: z.enum(['Yes', 'No', 'Somewhat']),
  languageSupport: z.enum(['Yes', 'No', 'I experienced some issues']),
  executionSpeed: feedbackScale,
  resultsDisplayed: z.enum(['Yes', 'No', 'Not sure']),
  overallSatisfaction: feedbackScale,
  likedMost: feedbackText,
  issuesSeen: z.array(z.enum(['No issues', 'Login issues', 'Code execution issues', 'Slow performance', 'Timer issues', 'Submission or result issues', 'Other'])).default([]),
  improvements: feedbackText,
  useAgain: z.enum(['Yes', 'No', 'Maybe']),
});
