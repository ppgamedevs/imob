/**
 * Escape HTML special characters to prevent HTML injection.
 * Safe for use in HTML element content and attribute values.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const HTML_ESCAPE_RE = /[&<>"'/]/g;

export function escapeHtml(str: string): string {
  return str.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}
