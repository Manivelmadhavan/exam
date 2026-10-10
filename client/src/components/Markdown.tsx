import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Safe Markdown renderer (raw HTML is not enabled). */
export const Markdown = ({ children }: { children: string }) => (
  <div className="markdown text-sm text-slate-700"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>
);
