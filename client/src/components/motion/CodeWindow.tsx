import { useEffect, useState } from 'react';
import clsx from 'clsx';

export type CodeLang = 'java' | 'cpp' | 'python';

interface Seg { t: string; c: string }
type Line = Seg[];

const KW = 'text-accent-400';      // purple
const TYP = 'text-sky-400';
const STR = 'text-emerald-300';
const NUM = 'text-amber-300';
const CMT = 'text-slate-500 italic';
const PLN = 'text-slate-300';
const FN = 'text-blue-300';

const JAVA: Line[] = [
  [{ t: 'import java.util.*;', c: KW }],
  [{ t: 'public ', c: KW }, { t: 'class ', c: KW }, { t: 'Solution', c: TYP }, { t: ' {', c: PLN }],
  [{ t: '  public static void main', c: FN }, { t: '(', c: PLN }, { t: 'String', c: TYP }, { t: '[] args) {', c: PLN }],
  [{ t: '    Scanner ', c: TYP }, { t: 'sc = ', c: PLN }, { t: 'new ', c: KW }, { t: 'Scanner', c: TYP }, { t: '(System.in);', c: PLN }],
  [{ t: '    int n = ', c: PLN }, { t: 'sc.nextInt();', c: FN }],
  [{ t: '    if ', c: KW }, { t: '(n % ', c: PLN }, { t: '2', c: NUM }, { t: ' == ', c: PLN }, { t: '0', c: NUM }, { t: ') {', c: PLN }],
  [{ t: '      System.out.println', c: FN }, { t: '("', c: STR }, { t: 'Even', c: STR }, { t: '");', c: STR }],
  [{ t: '    } ', c: KW }, { t: 'else {', c: PLN }],
  [{ t: '      System.out.println', c: FN }, { t: '("', c: STR }, { t: 'Odd', c: STR }, { t: '");', c: STR }],
  [{ t: '    }', c: PLN }],
  [{ t: '  }', c: PLN }],
  [{ t: '}', c: PLN }],
];

const CPP: Line[] = [
  [{ t: '#include', c: KW }, { t: ' <bits/stdc++.h>', c: STR }],
  [{ t: 'using namespace std;', c: PLN }],
  [{ t: 'int main', c: FN }, { t: '() {', c: PLN }],
  [{ t: '  int n;', c: PLN }],
  [{ t: '  cin ', c: FN }, { t: '>> n;', c: PLN }],
  [{ t: '  if ', c: KW }, { t: '(n % ', c: PLN }, { t: '2', c: NUM }, { t: ' == ', c: PLN }, { t: '0', c: NUM }, { t: ') {', c: PLN }],
  [{ t: '    cout ', c: FN }, { t: '<< "', c: STR }, { t: 'Even', c: STR }, { t: '";', c: STR }],
  [{ t: '  } ', c: KW }, { t: 'else {', c: PLN }],
  [{ t: '    cout ', c: FN }, { t: '<< "', c: STR }, { t: 'Odd', c: STR }, { t: '";', c: STR }],
  [{ t: '  }', c: PLN }],
  [{ t: '  return ', c: KW }, { t: '0', c: NUM }, { t: ';', c: PLN }],
  [{ t: '}', c: PLN }],
];

const PY: Line[] = [
  [{ t: 'def solve', c: FN }, { t: '():', c: PLN }],
  [{ t: '    n = ', c: PLN }, { t: 'int', c: TYP }, { t: '(input())', c: FN }],
  [{ t: '    if ', c: KW }, { t: 'n % ', c: PLN }, { t: '2', c: NUM }, { t: ' == ', c: PLN }, { t: '0', c: NUM }, { t: ':', c: PLN }],
  [{ t: '        print', c: FN }, { t: '("', c: STR }, { t: 'Even', c: STR }, { t: '")', c: STR }],
  [{ t: '    else', c: KW }, { t: ':', c: PLN }],
  [{ t: '        print', c: FN }, { t: '("', c: STR }, { t: 'Odd', c: STR }, { t: '")', c: STR }],
  [{ t: '', c: PLN }],
  [{ t: 'solve', c: FN }, { t: '()', c: PLN }],
];

const CODE: Record<CodeLang, Line[]> = { java: JAVA, cpp: CPP, python: PY };
const FILENAME: Record<CodeLang, string> = { java: 'Solution.java', cpp: 'solution.cpp', python: 'solution.py' };
const LANG_LABEL: Record<CodeLang, string> = { java: 'Java', cpp: 'C++', python: 'Python' };
const LANG_COLOR: Record<CodeLang, string> = { java: 'text-orange-400', cpp: 'text-sky-400', python: 'text-emerald-400' };

/** Animated code window that cycles through Java, C++ and Python snippets. Decorative only. */
export function CodeWindow({ className, staticLang }: { className?: string; staticLang?: CodeLang }) {
  const [index, setIndex] = useState(0);
  const order: CodeLang[] = ['java', 'cpp', 'python'];
  const lang = staticLang ?? order[index % 3];

  useEffect(() => {
    if (staticLang) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), 4200);
    return () => clearInterval(id);
  }, [staticLang]);

  const lines = CODE[lang];
  return (
    <div className={clsx('overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lift', className)}>
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <span className="rounded-md bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-200">{FILENAME[lang]}</span>
        <span className={clsx('ml-auto font-mono text-xs font-semibold', LANG_COLOR[lang])}>{LANG_LABEL[lang]}</span>
      </div>
      <pre key={lang} className="animate-fade-in overflow-x-auto px-4 py-3 font-mono text-[13px] leading-6">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              <span className="mr-4 inline-block w-5 select-none text-right text-slate-600">{i + 1}</span>
              {line.map((seg, j) => <span key={j} className={seg.c}>{seg.t}</span>)}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}