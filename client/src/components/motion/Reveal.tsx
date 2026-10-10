import { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** If true (default) the block only animates the first time it appears. */
  as?: 'div' | 'section' | 'li';
  animation?: 'fade-up' | 'fade-in' | 'slide-in-right' | 'slide-in-left' | 'scale-in';
  delay?: 'none' | '1' | '2' | '3' | '4' | '5';
  className?: string;
  style?: CSSProperties;
}

/** Lightweight entrance wrapper. Pure CSS animations so it respects prefers-reduced-motion. */
export function Reveal({ children, as = 'div', animation = 'fade-up', delay = 'none', className, style, ...rest }: RevealProps) {
  const cls = clsx(
    animation === 'fade-up' && 'animate-fade-up',
    animation === 'fade-in' && 'animate-fade-in',
    animation === 'slide-in-right' && 'animate-slide-in-right',
    animation === 'slide-in-left' && 'animate-slide-in-left',
    animation === 'scale-in' && 'animate-scale-in',
    delay !== 'none' && `delay-${delay}`,
    className,
  );
  const Tag = as as ElementType;
  return <Tag className={cls} style={style} {...rest}>{children}</Tag>;
}