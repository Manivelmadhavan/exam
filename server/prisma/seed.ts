import { PrismaClient, Language } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ALL: Language[] = ['PYTHON', 'JAVA', 'CPP'];

interface SeedQuestion {
  title: string; problemStatement: string; inputFormat: string; outputFormat: string; constraints: string;
  explanation: string; sampleInput: string; sampleOutput: string; marks: number; allowedLanguages: Language[];
  tests: Array<[string, string, boolean]>; // input, expected, isSample
}

const questions: SeedQuestion[] = [
  {
    title: 'Find Sum of Two Numbers',
    problemStatement: 'Given two integers, calculate their sum.',
    inputFormat: 'Two integers `A` and `B` separated by a space.', outputFormat: 'Print the sum of `A` and `B`.',
    constraints: '-10^9 <= A, B <= 10^9', explanation: '10 + 20 = 30', sampleInput: '10 20', sampleOutput: '30', marks: 10, allowedLanguages: ALL,
    tests: [['10 20', '30', true], ['5 7', '12', true], ['100 200', '300', false], ['-5 5', '0', false], ['1000000000 1000000000', '2000000000', false]],
  },
  {
    title: 'Even or Odd',
    problemStatement: 'Read an integer `N` and print `Even` if it is even, otherwise print `Odd`.',
    inputFormat: 'A single integer `N`.', outputFormat: 'Print `Even` or `Odd`.', constraints: '-10^9 <= N <= 10^9',
    explanation: '4 is divisible by 2, so it is Even.', sampleInput: '4', sampleOutput: 'Even', marks: 10, allowedLanguages: ALL,
    tests: [['4', 'Even', true], ['7', 'Odd', true], ['0', 'Even', false], ['-3', 'Odd', false], ['1000000', 'Even', false]],
  },
  {
    title: 'Factorial',
    problemStatement: 'Compute the factorial of a non-negative integer `N`.',
    inputFormat: 'A single integer `N`.', outputFormat: 'Print `N!`.', constraints: '0 <= N <= 15',
    explanation: '5! = 5 x 4 x 3 x 2 x 1 = 120', sampleInput: '5', sampleOutput: '120', marks: 15, allowedLanguages: ALL,
    tests: [['5', '120', true], ['0', '1', true], ['1', '1', false], ['10', '3628800', false], ['15', '1307674368000', false]],
  },
  {
    title: 'Reverse a String',
    problemStatement: 'Read a single word and print it reversed.',
    inputFormat: 'A single string without spaces.', outputFormat: 'Print the reversed string.', constraints: '1 <= length <= 1000',
    explanation: '"hello" reversed is "olleh".', sampleInput: 'hello', sampleOutput: 'olleh', marks: 15, allowedLanguages: ['PYTHON', 'JAVA'],
    tests: [['hello', 'olleh', true], ['a', 'a', false], ['racecar', 'racecar', false], ['OpenAI', 'IAnepO', false]],
  },
  {
    title: 'Fibonacci Number',
    problemStatement: 'Print the `N`-th Fibonacci number where F(0)=0 and F(1)=1.',
    inputFormat: 'A single integer `N`.', outputFormat: 'Print `F(N)`.', constraints: '0 <= N <= 40',
    explanation: 'F: 0, 1, 1, 2, 3, 5, 8 -> F(6)=8', sampleInput: '6', sampleOutput: '8', marks: 20, allowedLanguages: ['PYTHON'],
    tests: [['6', '8', true], ['0', '0', false], ['1', '1', false], ['20', '6765', false], ['40', '102334155', false]],
  },
];

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' }, update: {},
    create: { username: 'admin', email: 'admin@example.com', name: 'Teacher Admin', passwordHash: adminPassword },
  });

  const studentPassword = await bcrypt.hash('Student@123', 10);
  await prisma.student.upsert({
    where: { studentId: 'STU001' }, update: {},
    create: { studentId: 'STU001', name: 'Demo Student 1', year: 'ONE_YEAR', passwordHash: studentPassword, email: 'stu001@example.com', department: 'Computer Science' },
  });
  await prisma.student.upsert({
    where: { studentId: 'STU002' }, update: {},
    create: { studentId: 'STU002', name: 'Demo Student 2', year: 'TWO_YEAR', passwordHash: studentPassword, email: 'stu002@example.com', department: 'Computer Science' },
  });

  const title = 'Python Programming Test';
  if (await prisma.exam.findFirst({ where: { title } })) {
    console.log('Sample exam already exists - seed finished.');
    return;
  }
  const created = [];
  for (const [i, q] of questions.entries()) {
    const { tests, ...data } = q;
    created.push(await prisma.question.create({
      data: { ...data, orderNumber: i + 1, testCases: { create: tests.map(([input, expectedOutput, isSample]) => ({ input, expectedOutput, isSample, weight: 1 })) } },
    }));
  }
  const now = Date.now();
  await prisma.exam.create({
    data: {
      title, description: 'Basic programming problems covering input/output, conditions, loops and strings.',
      year: 'BOTH', durationMinutes: 60, status: 'PUBLISHED', languages: ALL,
      startDateTime: new Date(now - 24 * 3600_000), endDateTime: new Date(now + 365 * 24 * 3600_000),
      instructions: '- Read every problem carefully.\n- Use **Run Code** to test with custom input; it does not submit.\n- Use **Submit Answer** to evaluate against hidden test cases.\n- The exam is submitted automatically when time ends.',
      totalMarks: created.reduce((s, q) => s + q.marks, 0),
      questions: { create: created.map((q, i) => ({ questionId: q.id, questionNumber: i + 1, marks: q.marks })) },
    },
  });
  console.log('Seed complete. Admin: admin / Admin@123 | Students: STU001, STU002 / Student@123');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
