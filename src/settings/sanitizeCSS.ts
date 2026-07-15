export function sanitizeCSS(css: string): string {
  let sanitized = css;

  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/<\s*\/\s*style\s*>/gi, '');
  sanitized = sanitized.replace(/[<>]/g, '');
  sanitized = sanitized.replace(
    /expression\s*\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\)/gi,
    '',
  );

  sanitized = sanitized.replace(
    /url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi,
    (_match, quote: string, inner: string) => {
      if (/[\\\n\r]/.test(inner)) return '';
      const trimmed = inner.trim();
      if (/^https:/i.test(trimmed) || /^data:image\//i.test(trimmed)) {
        return `url(${quote}${inner}${quote})`;
      }
      return '';
    },
  );

  sanitized = sanitized.replace(/@import\b[^;]*;?/gi, '');
  sanitized = sanitized.replace(/@charset\b[^;]*;?/gi, '');
  sanitized = sanitized.replace(/-moz-binding\s*:[^;}"']*(;|(?=[}"']))/gi, '');
  sanitized = sanitized.replace(/behavior\s*:[^;}"']*(;|(?=[}"']))/gi, '');

  return sanitized;
}
