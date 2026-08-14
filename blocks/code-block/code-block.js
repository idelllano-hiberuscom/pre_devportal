const LANGUAGE_LABELS = {
  html: 'HTML',
  javascript: 'JavaScript',
  json: 'JSON',
  shell: 'Shell',
  text: 'Text',
  xml: 'XML',
};

const LANGUAGE_ALIASES = {
  bash: 'shell',
  console: 'shell',
  curl: 'shell',
  htm: 'html',
  js: 'javascript',
  plaintext: 'text',
  shell: 'shell',
  sh: 'shell',
  txt: 'text',
};

const GENERIC_LANGUAGE_TOKENS = new Set([
  'block',
  'code',
  'custom',
  'hljs',
  'line',
  'lines',
  'numbers',
]);

const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete',
  'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in',
  'instanceof', 'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try',
  'typeof', 'var', 'void', 'while', 'yield',
]);

const JS_LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

function isGenericLanguageToken(token) {
  return token.split(/[-_]/).every((part) => !part || GENERIC_LANGUAGE_TOKENS.has(part));
}

function normalizeLanguage(value = '') {
  const normalizedValue = value.toLowerCase().trim();
  if (!normalizedValue) return 'text';

  const tokens = normalizedValue.match(/[a-z0-9#+-]+/g) || [];
  const languageToken = tokens.find((token) => {
    if (token.startsWith('language-')) return true;
    if (token.startsWith('lang-')) return true;
    return LANGUAGE_LABELS[token] || LANGUAGE_ALIASES[token];
  });

  if (languageToken?.startsWith('language-')) {
    return normalizeLanguage(languageToken.replace('language-', ''));
  }

  if (languageToken?.startsWith('lang-')) {
    return normalizeLanguage(languageToken.replace('lang-', ''));
  }

  if (languageToken && LANGUAGE_ALIASES[languageToken]) {
    return LANGUAGE_ALIASES[languageToken];
  }

  if (languageToken && LANGUAGE_LABELS[languageToken]) {
    return languageToken;
  }

  const fallbackToken = tokens.find((token) => !isGenericLanguageToken(token));
  return fallbackToken || 'text';
}

function formatLanguage(language) {
  if (LANGUAGE_LABELS[language]) return LANGUAGE_LABELS[language];

  return language
    .split(/[-_]/)
    .filter(Boolean)
    .map((token) => (token.length <= 3 ? token.toUpperCase() : `${token[0].toUpperCase()}${token.slice(1)}`))
    .join(' ');
}

function normalizeCode(value = '') {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/^\n+|\n+$/g, '');
}

/*
 * Resaltado de sintaxis mínimo y sin dependencias.
 * El portal usa highlight.js; aquí se reproduce únicamente el conjunto de tokens que sus
 * capturas muestran (clave, cadena, número, literal, comentario, etiqueta, puntuación) para
 * los lenguajes que declara el modelo. Cada tokenizador recibe una línea y devuelve
 * [{ text, type }]; `type` vacío significa texto sin clasificar.
 */

/** Ejecuta un patrón maestro sobre la línea y clasifica cada coincidencia. */
function tokenizeWith(line, pattern, classify) {
  const tokens = [];
  let lastIndex = 0;
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let match = regex.exec(line);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), type: '' });
    }
    tokens.push({ text: match[0], type: classify(match) });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) regex.lastIndex += 1;
    match = regex.exec(line);
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), type: '' });
  }

  return tokens;
}

const JSON_PATTERN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b|([{}[\],:])/;

function tokenizeJson(line) {
  return tokenizeWith(line, JSON_PATTERN, (match) => {
    if (match[1]) return match[2] ? 'attr' : 'string';
    if (match[3]) return 'number';
    if (match[4]) return 'literal';
    if (match[5]) return 'punctuation';
    return '';
  }).flatMap((token) => {
    // Una clave llega como `"nombre":`; se parte para colorear los dos puntos como puntuación.
    if (token.type !== 'attr') return token;
    const separator = token.text.indexOf(':');
    if (separator < 0) return token;
    return [
      { text: token.text.slice(0, separator), type: 'attr' },
      { text: token.text.slice(separator), type: 'punctuation' },
    ];
  });
}

const JS_PATTERN = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(-?\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b|([{}[\]();,.:=+\-*/<>!?&|])/;

function tokenizeJavascript(line) {
  return tokenizeWith(line, JS_PATTERN, (match) => {
    if (match[1]) return 'comment';
    if (match[2]) return 'string';
    if (match[3]) return 'number';
    if (match[4]) {
      if (JS_KEYWORDS.has(match[4])) return 'keyword';
      if (JS_LITERALS.has(match[4])) return 'literal';
      return '';
    }
    if (match[5]) return 'punctuation';
    return '';
  });
}

const MARKUP_PATTERN = /(<!--.*?-->)|(<\/?[A-Za-z][\w:-]*)|(\/?>)|([A-Za-z_:][\w:.-]*)(?==)|("(?:[^"]*)"|'(?:[^']*)')|([=])/;

function tokenizeMarkup(line) {
  return tokenizeWith(line, MARKUP_PATTERN, (match) => {
    if (match[1]) return 'comment';
    if (match[2]) return 'tag';
    if (match[3]) return 'tag';
    if (match[4]) return 'attr';
    if (match[5]) return 'string';
    if (match[6]) return 'punctuation';
    return '';
  });
}

const SHELL_PATTERN = /(#.*$)|("(?:\\.|[^"\\])*"|'(?:[^']*)')|(\s-{1,2}[A-Za-z][\w-]*)|([|><;&])/;

function tokenizeShell(line) {
  return tokenizeWith(line, SHELL_PATTERN, (match) => {
    if (match[1]) return 'comment';
    if (match[2]) return 'string';
    if (match[3]) return 'attr';
    if (match[4]) return 'punctuation';
    return '';
  });
}

const TOKENIZERS = {
  json: tokenizeJson,
  javascript: tokenizeJavascript,
  html: tokenizeMarkup,
  xml: tokenizeMarkup,
  shell: tokenizeShell,
};

function announceStatus(liveRegion, message) {
  liveRegion.textContent = '';
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 0);
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Copy command failed');
  }
}

function copyCode(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      fallbackCopy(text);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function createCopyIcon() {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '8');
  rect.setAttribute('y', '8');
  rect.setAttribute('width', '14');
  rect.setAttribute('height', '14');
  rect.setAttribute('rx', '2');
  rect.setAttribute('ry', '2');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2');

  icon.append(rect, path);
  return icon;
}

function buildCodeLines(codeText, language) {
  const list = document.createElement('ol');
  list.className = 'code-block-lines';
  const tokenize = TOKENIZERS[language];

  codeText.split('\n').forEach((line) => {
    const item = document.createElement('li');
    const content = document.createElement('span');
    content.className = 'code-block-line';

    if (!line) {
      content.textContent = ' ';
    } else if (!tokenize) {
      content.textContent = line;
    } else {
      tokenize(line).forEach(({ text, type }) => {
        if (!text) return;
        if (!type) {
          content.append(document.createTextNode(text));
          return;
        }
        const span = document.createElement('span');
        span.className = `code-token-${type}`;
        span.textContent = text;
        content.append(span);
      });
    }

    item.append(content);
    list.append(item);
  });

  return list;
}

/*
 * El código llega como richtext y no como texto plano por una razón concreta: la entrega
 * colapsa los saltos de línea de un campo de texto, y un curl de quince líneas acababa en
 * una sola. En richtext cada línea viaja como su propio elemento (o dentro de un <pre>), y
 * de ahí se reconstruye el original.
 */
function readCode(cell) {
  const pre = cell.querySelector('pre');
  if (pre) return pre.textContent;

  const lines = [...cell.children].filter((child) => child.tagName !== 'BR');
  if (lines.length > 1) return lines.map((line) => line.textContent).join('\n');

  return cell.textContent;
}

/*
 * Las filas tampoco se leen por posición: AEM omite la de cualquier campo vacío, así que un
 * bloque sin rótulo desplazaba idioma y código. El código es la celda con <pre> o con varias
 * líneas, el idioma la que coincide con un token conocido, y el rótulo lo que queda.
 */
function resolveCells(cells) {
  const codeCell = cells.find((cell) => cell.querySelector('pre'))
    || cells.find((cell) => cell.children.length > 1)
    || cells[cells.length - 1];

  const rest = cells.filter((cell) => cell !== codeCell);
  const languageIndex = rest.findIndex((cell) => {
    const token = cell.textContent.trim().toLowerCase();
    return Boolean(LANGUAGE_LABELS[token] || LANGUAGE_ALIASES[token]);
  });
  const languageCell = languageIndex >= 0 ? rest.splice(languageIndex, 1)[0] : null;

  return { titleCell: rest[0] || null, languageCell, codeCell };
}

export default function decorate(block) {
  const rows = [...block.children];
  const { titleCell, languageCell, codeCell } = resolveCells(
    rows.map((row) => row.firstElementChild || row).filter(Boolean),
  );

  if (!codeCell) return;

  const title = titleCell?.textContent.trim() || '';
  const language = normalizeLanguage(languageCell?.textContent || '');
  const codeText = normalizeCode(readCode(codeCell));

  const content = document.createElement('div');
  content.className = 'code-block-content';

  // Barra de cabecera navy del portal: título en blanco a la izquierda, copiar a la derecha.
  const header = document.createElement('div');
  header.className = 'code-block-header';

  if (titleCell) {
    titleCell.className = 'code-block-title';
    titleCell.textContent = title;
    header.append(titleCell);
  }

  // El portal no muestra etiqueta de lenguaje: el campo se conserva oculto para que
  // Universal Editor siga pudiendo editarlo sin alterar el aspecto.
  if (languageCell) {
    languageCell.className = 'code-block-language';
    languageCell.textContent = formatLanguage(language);
    languageCell.setAttribute('aria-hidden', 'true');
  }

  const actions = document.createElement('div');
  actions.className = 'code-block-actions';

  const liveRegion = document.createElement('span');
  liveRegion.className = 'code-block-status';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  const copyButton = document.createElement('button');
  copyButton.className = 'code-block-copy';
  copyButton.type = 'button';
  copyButton.setAttribute('aria-label', 'Copiar código');
  copyButton.append(createCopyIcon());
  copyButton.addEventListener('click', () => {
    copyCode(codeText)
      .then(() => announceStatus(liveRegion, 'Código copiado'))
      .catch(() => announceStatus(liveRegion, 'No se pudo copiar el código'));
  });

  actions.append(copyButton, liveRegion);
  header.append(actions);

  codeCell.className = 'code-block-body';
  codeCell.textContent = '';

  const pre = document.createElement('pre');
  pre.className = 'code-block-pre';

  const code = document.createElement('code');
  code.className = `code-block-code language-${language}`;
  code.dataset.language = language;
  code.append(buildCodeLines(codeText || '', language));

  pre.append(code);
  codeCell.append(pre);
  content.append(header, codeCell);
  if (languageCell) content.append(languageCell);

  rows.forEach((row) => row.remove());
  block.append(content);
}
