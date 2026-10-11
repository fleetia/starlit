const BLOCKED_AT_RULES = new Set(['charset', 'import']);
const BLOCKED_RESOURCE_FUNCTIONS = new Set([
  '-webkit-cross-fade',
  '-webkit-image-set',
  'cross-fade',
  'image',
  'image-set',
  'src',
  'url',
]);
const SAFE_EMBEDDED_RASTER_URL =
  /^data:image\/(?:avif|bmp|gif|jpeg|jpg|png|webp);base64,[a-z0-9+/]+={0,2}$/iu;

type CssIdentifier = {
  end: number;
  value: string;
};

type CssString = {
  end: number;
  isClosed: boolean;
};

type CssEscape = {
  end: number;
  value: string;
};

function isCssWhitespace(character: string): boolean {
  return /[\t\n\f\r ]/u.test(character);
}

function isHexDigit(character: string): boolean {
  return /[0-9a-f]/iu.test(character);
}

function isIdentifierCharacter(character: string): boolean {
  if (character === '') {
    return false;
  }

  const codePoint = character.codePointAt(0);
  return (
    /[a-z0-9_-]/iu.test(character) ||
    (codePoint !== undefined && codePoint >= 0x80)
  );
}

function readCssEscape(source: string, start: number): CssEscape {
  const next = source[start + 1];
  if (next === undefined) {
    return { end: source.length, value: '' };
  }

  if (next === '\n' || next === '\f') {
    return { end: start + 2, value: '' };
  }
  if (next === '\r') {
    return {
      end: source[start + 2] === '\n' ? start + 3 : start + 2,
      value: '',
    };
  }

  if (!isHexDigit(next)) {
    return { end: start + 2, value: next };
  }

  let end = start + 1;
  while (
    end < source.length &&
    end < start + 7 &&
    isHexDigit(source.charAt(end))
  ) {
    end += 1;
  }
  const codePoint = Number.parseInt(source.slice(start + 1, end), 16);
  if (isCssWhitespace(source[end] ?? '')) {
    end += source[end] === '\r' && source[end + 1] === '\n' ? 2 : 1;
  }

  const value =
    codePoint === 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? '\uFFFD'
      : String.fromCodePoint(codePoint);
  return { end, value };
}

function readCssIdentifier(source: string, start: number): CssIdentifier {
  let end = start;
  let value = '';

  while (end < source.length) {
    const character = source.charAt(end);
    if (character === '\\') {
      const escape = readCssEscape(source, end);
      value += escape.value;
      end = escape.end;
      continue;
    }
    if (!isIdentifierCharacter(character)) {
      break;
    }

    value += character;
    end += 1;
  }

  return { end, value };
}

function readCssString(source: string, start: number): CssString {
  const quote = source[start];
  let index = start + 1;

  while (index < source.length) {
    if (source[index] === '\\') {
      index = readCssEscape(source, index).end;
      continue;
    }
    if (
      source[index] === '\n' ||
      source[index] === '\r' ||
      source[index] === '\f'
    ) {
      return { end: index, isClosed: false };
    }
    if (source[index] === quote) {
      return { end: index + 1, isClosed: true };
    }
    index += 1;
  }

  return { end: source.length, isClosed: false };
}

function stripCssComments(source: string): string {
  let index = 0;
  let output = '';

  while (index < source.length) {
    const character = source.charAt(index);
    if (character === '"' || character === "'") {
      const string = readCssString(source, index);
      output += source.slice(index, string.end);
      index = string.end;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      index = commentEnd === -1 ? source.length : commentEnd + 2;
      continue;
    }
    if (character === '\\') {
      const escape = readCssEscape(source, index);
      output += source.slice(index, escape.end);
      index = escape.end;
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
}

function findClosingParenthesis(source: string, start: number): number {
  let depth = 1;
  let index = start + 1;

  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'") {
      index = readCssString(source, index).end;
      continue;
    }
    if (character === '\\') {
      index = readCssEscape(source, index).end;
      continue;
    }
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
    index += 1;
  }

  return source.length - 1;
}

function findAtRuleEnd(source: string, start: number): number {
  let blockDepth = 0;
  let parenthesisDepth = 0;
  let index = start;

  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'") {
      index = readCssString(source, index).end;
      continue;
    }
    if (character === '\\') {
      index = readCssEscape(source, index).end;
      continue;
    }
    if (character === '(') {
      parenthesisDepth += 1;
    } else if (character === ')' && parenthesisDepth > 0) {
      parenthesisDepth -= 1;
    } else if (character === '{' && parenthesisDepth === 0) {
      blockDepth += 1;
    } else if (character === '}' && parenthesisDepth === 0) {
      if (blockDepth === 0) {
        return index;
      }
      blockDepth -= 1;
      if (blockDepth === 0) {
        return index + 1;
      }
    } else if (
      character === ';' &&
      parenthesisDepth === 0 &&
      blockDepth === 0
    ) {
      return index + 1;
    }
    index += 1;
  }

  return source.length;
}

function decodeCssEscapes(source: string): string {
  let index = 0;
  let output = '';

  while (index < source.length) {
    if (source[index] !== '\\') {
      output += source[index];
      index += 1;
      continue;
    }

    const escape = readCssEscape(source, index);
    output += escape.value;
    index = escape.end;
  }

  return output;
}

function unwrapCssUrlArgument(source: string): string | null {
  const argument = source.trim();
  const quote = argument[0];
  if (quote !== '"' && quote !== "'") {
    return decodeCssEscapes(argument).trim();
  }

  const string = readCssString(argument, 0);
  if (!string.isClosed || string.end !== argument.length) {
    return null;
  }

  return decodeCssEscapes(argument.slice(1, -1)).trim();
}

function isSafeEmbeddedRasterUrl(source: string): boolean {
  const url = unwrapCssUrlArgument(source);
  return url !== null && SAFE_EMBEDDED_RASTER_URL.test(url);
}

function removeNetworkLoadingCss(source: string): string {
  let index = 0;
  let output = '';

  while (index < source.length) {
    const character = source.charAt(index);
    if (character === '"' || character === "'") {
      const string = readCssString(source, index);
      output += source.slice(index, string.end);
      index = string.end;
      continue;
    }
    if (character === '@') {
      const identifier = readCssIdentifier(source, index + 1);
      if (BLOCKED_AT_RULES.has(identifier.value.toLowerCase())) {
        index = findAtRuleEnd(source, identifier.end);
        continue;
      }
      output += character;
      index += 1;
      continue;
    }
    if (character === '\\' || isIdentifierCharacter(character)) {
      const identifier = readCssIdentifier(source, index);
      let openParenthesis = identifier.end;
      while (isCssWhitespace(source[openParenthesis] ?? '')) {
        openParenthesis += 1;
      }
      const functionName = identifier.value.toLowerCase();
      if (
        source[openParenthesis] === '(' &&
        BLOCKED_RESOURCE_FUNCTIONS.has(functionName)
      ) {
        const closingParenthesis = findClosingParenthesis(
          source,
          openParenthesis,
        );
        const isAllowedUrl =
          functionName === 'url' &&
          isSafeEmbeddedRasterUrl(
            source.slice(openParenthesis + 1, closingParenthesis),
          );
        output += isAllowedUrl
          ? source.slice(index, closingParenthesis + 1)
          : 'none';
        index = closingParenthesis + 1;
        continue;
      }

      output += source.slice(index, identifier.end);
      index = identifier.end;
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
}

export function sanitizeCSS(css: string): string {
  let sanitized = stripCssComments(css.replace(/\0/g, ''));

  sanitized = sanitized.replace(/<\s*\/\s*style\s*>/gi, '');
  sanitized = sanitized.replace(/[<>]/g, '');
  sanitized = removeNetworkLoadingCss(sanitized);
  sanitized = sanitized.replace(
    /expression\s*\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\)/gi,
    '',
  );
  sanitized = sanitized.replace(/-moz-binding\s*:[^;}"']*(;|(?=[}"']))/gi, '');
  sanitized = sanitized.replace(/behavior\s*:[^;}"']*(;|(?=[}"']))/gi, '');

  return sanitized;
}
