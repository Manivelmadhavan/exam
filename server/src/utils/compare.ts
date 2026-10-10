/**
 * Output comparison. Default: CRLF -> LF, trailing spaces per line ignored,
 * trailing blank lines ignored. strict=true keeps per-line trailing whitespace.
 */
export function normalizeOutput(text: string, strict = false): string {
  let t = (text ?? '').replace(/\r\n?/g, '\n');
  if (!strict) t = t.split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n');
  return t.replace(/\n+$/g, '');
}
export const outputsMatch = (actual: string, expected: string, strict = false): boolean =>
  normalizeOutput(actual, strict) === normalizeOutput(expected, strict);
