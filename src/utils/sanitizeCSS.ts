/**
 * Sanitize user-provided CSS to prevent XSS attacks.
 *
 * Strips dangerous patterns:
 * - expression(...) (including nested parentheses)
 * - url() — only allows https: and data:image/ URLs
 * - @import, @charset statements
 * - -moz-binding properties
 * - behavior: properties
 * - </style> tag injection
 * - Null bytes and backslash escapes in url()
 */
export function sanitizeCSS(css: string): string {
  let sanitized = css;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Block </style> tag injection
  sanitized = sanitized.replace(/<\s*\/\s*style\s*>/gi, "");

  // Remove HTML tags
  sanitized = sanitized.replace(/[<>]/g, "");

  // Remove expression(...) with nested parentheses support
  sanitized = sanitized.replace(
    /expression\s*\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\)/gi,
    ""
  );

  // Remove url() — only allow https: and data:image/ URLs
  sanitized = sanitized.replace(
    /url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi,
    (_match, quote: string, inner: string) => {
      // Block backslash escapes and newlines in the URL value
      if (/[\\\n\r]/.test(inner)) return "";
      const trimmed = inner.trim();
      if (/^https:/i.test(trimmed) || /^data:image\//i.test(trimmed)) {
        return `url(${quote}${inner}${quote})`;
      }
      return "";
    }
  );

  // Remove @import statements
  sanitized = sanitized.replace(/@import\b[^;]*;?/gi, "");

  // Remove @charset statements
  sanitized = sanitized.replace(/@charset\b[^;]*;?/gi, "");

  // Remove -moz-binding property
  sanitized = sanitized.replace(/-moz-binding\s*:[^;}"']*(;|(?=[}"']))/gi, "");

  // Remove behavior: property
  sanitized = sanitized.replace(/behavior\s*:[^;}"']*(;|(?=[}"']))/gi, "");

  return sanitized;
}
