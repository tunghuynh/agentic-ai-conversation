/**
 * syntax-highlight.js
 * Lightweight single-pass syntax highlighter for chat code blocks.
 * Uses named capture groups in one combined regex per language for accurate tokenization.
 *
 * Supports: javascript/typescript, python, html/xml, css/scss, json, bash/shell, sql
 *
 * Token span classes (prefixed hl-):
 *   hl-keyword, hl-string, hl-comment, hl-number,
 *   hl-function, hl-type, hl-attr, hl-tag, hl-builtin
 */
const Highlighter = (() => {
  const esc = s => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const span = (cls, s) => `<span class="hl-${cls}">${s}</span>`;

  /**
   * Build a single-pass highlighter from ordered rules.
   * Priority: first matching rule wins (put higher-priority rules first).
   * @param {{name:string, cls:string, pat:RegExp}[]} rules - pat must have no flags
   */
  function makeHighlighter(rules) {
    const src = rules.map(r => `(?<${r.name}>${r.pat.source})`).join('|');
    const re = new RegExp(src, 'gs');

    return function highlight(code) {
      let result = '';
      let last = 0;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(code)) !== null) {
        if (m.index > last) result += esc(code.slice(last, m.index));
        for (const rule of rules) {
          if (m.groups[rule.name] !== undefined) {
            result += span(rule.cls, esc(m[0]));
            break;
          }
        }
        last = re.lastIndex;
      }
      if (last < code.length) result += esc(code.slice(last));
      re.lastIndex = 0;
      return result;
    };
  }

  // --- Language Highlighters ---

  const jsHighlight = makeHighlighter([
    { name: 'tmpl', cls: 'string',   pat: /`(?:[^`\\]|\\.|\n)*?`/ },
    { name: 'str',  cls: 'string',   pat: /"(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?'/ },
    { name: 'cmt',  cls: 'comment',  pat: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
    { name: 'kw',   cls: 'keyword',  pat: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|yield|declare|abstract|implements|private|protected|public|readonly|override|satisfies|as)\b/ },
    { name: 'type', cls: 'type',     pat: /\b[A-Z][A-Za-z0-9_]*\b/ },
    { name: 'fn',   cls: 'function', pat: /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/ },
    { name: 'num',  cls: 'number',   pat: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b|0x[0-9a-fA-F]+\b/ },
  ]);

  const pyHighlight = makeHighlighter([
    { name: 'tdq',  cls: 'string',   pat: /"""[\s\S]*?"""|'''[\s\S]*?'''/ },
    { name: 'str',  cls: 'string',   pat: /"(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?'/ },
    { name: 'cmt',  cls: 'comment',  pat: /#[^\n]*/ },
    { name: 'dec',  cls: 'function', pat: /@[a-zA-Z_][a-zA-Z0-9_.]*\b/ },
    { name: 'kw',   cls: 'keyword',  pat: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/ },
    { name: 'blt',  cls: 'builtin',  pat: /\b(?:print|len|range|type|str|int|float|bool|list|dict|tuple|set|input|open|sorted|enumerate|zip|map|filter|any|all|sum|min|max|abs|round|isinstance|issubclass|hasattr|getattr|setattr|super|object|Exception|ValueError|TypeError|KeyError|IndexError|AttributeError|RuntimeError|StopIteration|NotImplementedError)\b/ },
    { name: 'type', cls: 'type',     pat: /\b[A-Z][A-Za-z0-9_]*\b/ },
    { name: 'fn',   cls: 'function', pat: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/ },
    { name: 'num',  cls: 'number',   pat: /\b\d+\.?\d*\b/ },
  ]);

  const cssHighlight = makeHighlighter([
    { name: 'cmt',  cls: 'comment',  pat: /\/\*[\s\S]*?\*\// },
    { name: 'str',  cls: 'string',   pat: /"[^"]*"|'[^']*'/ },
    { name: 'at',   cls: 'keyword',  pat: /@[a-zA-Z-]+\b/ },
    { name: 'clr',  cls: 'number',   pat: /#[0-9a-fA-F]{3,8}\b/ },
    { name: 'num',  cls: 'number',   pat: /\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg|fr|ch|ex|vmin|vmax|pt|svh|dvh)?\b/ },
    { name: 'prop', cls: 'attr',     pat: /\b[a-z-]+(?=\s*:)/ },
    { name: 'imp',  cls: 'keyword',  pat: /!important\b/ },
  ]);

  const jsonHighlight = makeHighlighter([
    { name: 'key',  cls: 'attr',     pat: /"(?:[^"\\]|\\.)*"\s*(?=:)/ },
    { name: 'str',  cls: 'string',   pat: /"(?:[^"\\]|\\.)*"/ },
    { name: 'num',  cls: 'number',   pat: /-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
    { name: 'kw',   cls: 'keyword',  pat: /\b(?:true|false|null)\b/ },
  ]);

  const bashHighlight = makeHighlighter([
    { name: 'cmt',  cls: 'comment',  pat: /#[^\n]*/ },
    { name: 'str',  cls: 'string',   pat: /"(?:[^"\\]|\\.)*?"|'[^']*'/ },
    { name: 'kw',   cls: 'keyword',  pat: /\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|local|export|readonly|declare|unset|shift|source|echo|printf|read|true|false|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|chmod|sudo)\b/ },
    { name: 'var',  cls: 'type',     pat: /\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/ },
    { name: 'sub',  cls: 'function', pat: /\$\([^)]*\)/ },
    { name: 'num',  cls: 'number',   pat: /\b\d+\b/ },
  ]);

  const sqlHighlight = makeHighlighter([
    { name: 'cmt',  cls: 'comment',  pat: /--[^\n]*|\/\*[\s\S]*?\*\// },
    { name: 'str',  cls: 'string',   pat: /'[^']*'/ },
    { name: 'kw',   cls: 'keyword',  pat: /\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|DISTINCT|AS|UNION|ALL|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|WITH|BEGIN|COMMIT|ROLLBACK|REPLACE|TRUNCATE|GRANT|REVOKE)\b/i },
    { name: 'num',  cls: 'number',   pat: /\b\d+\.?\d*\b/ },
  ]);

  // HTML/XML: staged approach to preserve nested tag structure
  function htmlHighlight(code) {
    const saved = [];
    const save = t => { const k = `\x00${saved.length}\x00`; saved.push(t); return k; };
    const restore = s => saved.reduce((acc, t, i) => acc.split(`\x00${i}\x00`).join(t), s);

    // Save comments first
    code = code.replace(/<!--[\s\S]*?-->/g, m => save(span('comment', esc(m))));

    // Parse and save highlighted tags
    code = code.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g, fullTag => {
      const parts = [];
      const openMatch = /^(<\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(fullTag);
      if (!openMatch) return save(esc(fullTag));

      parts.push(esc(openMatch[1]), span('tag', openMatch[2]));
      let rest = fullTag.slice(openMatch[0].length);

      // Attribute regex: handles quoted values containing spaces
      const attrRe = /\s+([a-zA-Z:_][a-zA-Z0-9:_.@-]*)(?:=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s>\/]+))?/g;
      let last = 0;
      let am;
      while ((am = attrRe.exec(rest)) !== null) {
        if (am.index > last) parts.push(esc(rest.slice(last, am.index)));
        parts.push(' ', span('attr', am[1]));
        if (am[2] !== undefined) parts.push('=' + span('string', esc(am[2])));
        last = attrRe.lastIndex;
      }
      parts.push(esc(rest.slice(last)));
      return save(parts.join(''));
    });

    code = esc(code); // escape remaining text nodes
    return restore(code);
  }

  // --- Language Map ---
  const langMap = {
    js: jsHighlight, javascript: jsHighlight, jsx: jsHighlight,
    ts: jsHighlight, typescript: jsHighlight, tsx: jsHighlight, mjs: jsHighlight,
    py: pyHighlight, python: pyHighlight, python3: pyHighlight,
    html: htmlHighlight, htm: htmlHighlight, xml: htmlHighlight, svg: htmlHighlight,
    css: cssHighlight, scss: cssHighlight, sass: cssHighlight, less: cssHighlight,
    json: jsonHighlight, jsonc: jsonHighlight,
    sh: bashHighlight, bash: bashHighlight, shell: bashHighlight, zsh: bashHighlight,
    sql: sqlHighlight, mysql: sqlHighlight, postgresql: sqlHighlight, postgres: sqlHighlight,
  };

  return {
    highlight(code, lang) {
      const fn = langMap[(lang || '').toLowerCase().trim()];
      if (!fn) return esc(code);
      try { return fn(code); } catch { return esc(code); }
    },
  };
})();
