import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatter?: (v: number) => string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Animated numeric counter. Falls back to a static value when the user prefers reduced motion. */
export function AnimatedNumber({ value, duration = 900, decimals = 0, className, prefix = '', suffix = '', formatter }: Props) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);
  const fromRef = useRef(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = fromRef.current;
    const delta = value - from;
    cancelAnimationFrame(frame.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const cur = from + delta * easeOutCubic(t);
      setDisplay(cur);
      if (t < 1) frame.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  const text = formatter ? formatter(display) : display.toFixed(decimals);
  return (
    <span className={className}>
      {prefix}{text}{suffix}
    </span>
  );
}