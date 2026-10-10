import { Language } from '@prisma/client';

export const STARTER_CODE: Record<Language, string> = {
  PYTHON: 'import sys\n\n# Write your solution here\n',
  JAVA: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  CPP: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
};

const squash = (s: string) => s.replace(/\s+/g, '');
export const isBlankOrStarter = (language: Language, code: string): boolean =>
  squash(code) === '' || squash(code) === squash(STARTER_CODE[language]);
