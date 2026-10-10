import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface Props {
  lines: string[];
  typingSpeed?: number;
  pauseBetweenLines?: number;
  className?: string;
  showCaret?: boolean;
}

/** Terminal typing effect that writes an array of lines one after the other. */
export function Typewriter({ lines, typingSpeed = 42, pauseBetweenLines = 500, className, showCaret = true }: Props) {
  const [text, setText] = useState('');
  const [line, setLine] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (line >= lines.length) return;
    const target = lines[line];
    let i = 0;
    const tick = () => {
      i += 1;
      setText(target.slice(0, i));
      if (i < target.length) {
        timers.current.push(window.setTimeout(tick, typingSpeed));
      } else {
        if (line < lines.length - 1) {
          timers.current.push(window.setTimeout(() => setLine((l) => l + 1), pauseBetweenLines));
        }
      }
    };
    timers.current.push(window.setTimeout(tick, 200));
    return () => timers.current.forEach(clearTimeout);
  }, [line, lines, typingSpeed, pauseBetweenLines]);

  const done = line >= lines.length;
  return (
    <div className={clsx('font-mono text-sm leading-relaxed', className)} aria-hidden>
      <pre className="whitespace-pre-wrap text-slate-300">{text}
        {showCaret && !done && <span className="inline-block h-4 w-2 translate-y-0.5 animate-caret bg-accent-400" />}
      </pre>
    </div>
  );
}