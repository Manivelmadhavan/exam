import { CSSProperties, useMemo } from 'react';

interface Symbol { token: string; lang: 'java' | 'cpp' | 'python' | 'generic'; left: string; top: string; size: string; dur: string; delay: string }

const COLORS: Record<Symbol['lang'], string> = {
  java: 'text-orange-400/70',
  cpp: 'text-sky-500/70',
  python: 'text-emerald-400/70',
  generic: 'text-slate-400/50',
};

/** Floating coding symbols used as a decorative background on landing/login pages. */
export function FloatingSymbols({ count = 18, className }: { count?: number; className?: string }) {
  const symbols = useMemo<Symbol[]>(() => {
    const tokens: Array<[string, Symbol['lang']]> = [
      ['{ }', 'generic'], ['</>', 'generic'], ['#include', 'cpp'], ['int main()', 'cpp'], ['std::cout', 'cpp'], ['cout <<', 'cpp'],
      ['public class', 'java'], ['System.out', 'java'], ['new Object()', 'java'], ['import java.', 'java'],
      ['def ', 'python'], ['print()', 'python'], ['lambda', 'python'], ['>>>', 'python'], ['if __name__', 'python'],
      ['return 0;', 'cpp'], ['void main', 'java'], ['len(list)', 'python'],
    ];
    const seeded: Symbol[] = [];
    for (let i = 0; i < count; i++) {
      const [token, lang] = tokens[i % tokens.length] ?? ['</>', 'generic'];
      seeded.push({
        token,
        lang,
        left: `${(i * 61) % 100}%`,
        top: `${(i * 37 + 13) % 100}%`,
        size: `${0.5 + ((i * 7) % 30) / 50}rem`,
        dur: `${5 + ((i * 3) % 7)}s`,
        delay: `${(i * 13) % 60 / 10}s`,
      });
    }
    return seeded;
  }, [count]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${className ?? ''}`}>
      {symbols.map((s, i) => {
        const style: CSSProperties = { left: s.left, top: s.top, fontSize: s.size, animationDuration: s.dur, animationDelay: s.delay };
        return (
          <span key={i} className={`absolute animate-float font-mono font-semibold opacity-40 ${COLORS[s.lang]}`} style={style}>
            {s.token}
          </span>
        );
      })}
    </div>
  );
}