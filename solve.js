const LF = 10;
const CR = 13;
const QUOTE = 34;
const COMMA = 44;
const EMPTY = '';

function readQuoted(text, start) {
  let span = start;
  let prefix;
  let breaks = 0;
  for (let pos = start; pos < text.length; ) {
    const code = text.charCodeAt(pos);
    if (code === QUOTE) {
      const piece = text.slice(span, pos);
      if (text.charCodeAt(++pos) !== QUOTE) {
        return { value: prefix === undefined ? piece : prefix + piece, pos, breaks };
      }
      prefix = prefix === undefined ? piece + '"' : prefix + piece + '"';
      span = ++pos;
    } else if (code === CR) {
      const piece = text.slice(span, pos);
      prefix = prefix === undefined ? piece + '\n' : prefix + piece + '\n';
      pos += text.charCodeAt(pos + 1) === LF ? 2 : 1;
      span = pos;
      breaks++;
    } else {
      if (code === LF) breaks++;
      pos++;
    }
  }
  // With no closing quote, the caller scans again from the opening quote as unquoted text.
}

function unquotedEnd(text, pos) {
  while (pos < text.length) {
    const code = text.charCodeAt(pos);
    if (code === COMMA || code === LF || code === CR) break;
    pos++;
  }
  return pos;
}

function readStrayCRs(text, start, pos, errors, line, row) {
  let value = text.slice(start, pos);
  do {
    errors.push({ code: 'stray_cr', line, row });
    start = pos + 1;
    pos = unquotedEnd(text, start);
    value += text.slice(start, pos);
  } while (text.charCodeAt(pos) === CR && text.charCodeAt(pos + 1) !== LF);
  return { value, pos };
}

function fixWidth(fields, count, width, errors, line, row) {
  if (count < width) {
    errors.push({ code: 'short_row', line, row, fields: count });
    fields.fill(EMPTY, count);
  } else {
    errors.push({ code: 'long_row', line, row, extra: fields.splice(width) });
  }
}

function scan(text, header) {
  const rows = [];
  const errors = [];
  let columns = null;
  let width = 0;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  while (pos < text.length) {
    const recordLine = line;
    const row = header && columns === null ? null : rows.length;
    const fields = width === 0 ? [] : new Array(width);
    let count = 0;
    let delimiter;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === QUOTE;
      let prefix;
      if (quoted) {
        const enclosed = readQuoted(text, pos + 1);
        if (enclosed) {
          prefix = enclosed.value;
          line += enclosed.breaks;
          pos = enclosed.pos;
        } else {
          errors.push({ code: 'unterminated_quote', line: recordLine, row });
        }
      }

      const span = pos;
      pos = unquotedEnd(text, pos);
      delimiter = text.charCodeAt(pos);
      let tail;
      if (delimiter === CR && text.charCodeAt(pos + 1) !== LF) {
        const rest = readStrayCRs(text, span, pos, errors, recordLine, row);
        tail = rest.value;
        pos = rest.pos;
        delimiter = text.charCodeAt(pos);
      } else {
        tail = text.slice(span, pos);
      }
      if (prefix !== undefined && tail !== EMPTY) {
        errors.push({ code: 'quote_junk', line: recordLine, row });
        prefix += tail;
      }
      fields[count++] = prefix === undefined ? tail : prefix;

      if (delimiter === COMMA) pos++;
      else if (delimiter === LF || delimiter === CR) {
        pos += delimiter === LF ? 1 : 2;
        line++;
      }
    } while (delimiter === COMMA);

    if (count === 1 && fields[0] === EMPTY && !quoted) continue;
    if (width === 0) width = count;
    if (row === null) {
      columns = fields;
      continue;
    }
    if (count !== width) fixWidth(fields, count, width, errors, recordLine, row);
    rows.push(fields);
  }

  return { columns: header ? columns ?? [] : null, rows, errors };
}

export function run(input) {
  return scan(String(input.text), input.header === true);
}
