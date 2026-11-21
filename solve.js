const LF = 10;
const CR = 13;
const QUOTE = 34;
const COMMA = 44;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const rows = [];
  const errors = [];
  let columns = null;
  let width = 0;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  while (pos < text.length) {
    const recordLine = line;
    const row = header && columns === null ? null : rows.length;
    const fields = [];
    let delimiter;
    let quoted;
    do {
      const start = pos;
      quoted = text.charCodeAt(pos) === QUOTE;
      let value = '';
      let closed = false;
      if (quoted) {
        const openingLine = line;
        let span = ++pos;
        while (pos < text.length) {
          const code = text.charCodeAt(pos);
          if (code === QUOTE) {
            value += text.slice(span, pos);
            pos++;
            if (text.charCodeAt(pos) !== QUOTE) {
              closed = true;
              break;
            }
            value += '"';
            span = ++pos;
          } else if (code === CR) {
            value += text.slice(span, pos) + '\n';
            pos += text.charCodeAt(pos + 1) === LF ? 2 : 1;
            span = pos;
            line++;
          } else {
            if (code === LF) line++;
            pos++;
          }
        }
        if (!closed) {
          // The opening quote is literal. Restore the state before trying it.
          errors.push({ code: 'unterminated_quote', line: recordLine, row });
          line = openingLine;
          pos = start;
          value = '';
        }
      }

      let span = pos;
      const quotedLength = value.length;
      // Slice a whole unquoted span at once. A dropped CR splits the span.
      while (pos < text.length) {
        const code = text.charCodeAt(pos);
        if (code === COMMA || code === LF) break;
        if (code === CR) {
          if (text.charCodeAt(pos + 1) === LF) break;
          errors.push({ code: 'stray_cr', line: recordLine, row });
          value += text.slice(span, pos);
          span = pos + 1;
        }
        pos++;
      }
      value += text.slice(span, pos);
      if (closed && value.length > quotedLength) {
        errors.push({ code: 'quote_junk', line: recordLine, row });
      }
      fields.push(value);

      delimiter = text.charCodeAt(pos);
      if (delimiter === COMMA) pos++;
      else if (delimiter === LF || delimiter === CR) {
        pos += delimiter === LF ? 1 : 2;
        line++;
      }
    } while (delimiter === COMMA);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width === 0) width = fields.length;
    if (row === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? columns ?? [] : null, rows, errors };
}
