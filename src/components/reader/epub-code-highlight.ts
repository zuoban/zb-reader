const CODE_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "function",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "mut",
  "namespace",
  "new",
  "nullptr",
  "pub",
  "return",
  "self",
  "static",
  "struct",
  "switch",
  "this",
  "throw",
  "trait",
  "true",
  "try",
  "typedef",
  "typeof",
  "unsafe",
  "use",
  "using",
  "var",
  "while",
]);

const CODE_TYPES = new Set([
  "bool",
  "char",
  "double",
  "float",
  "i16",
  "i32",
  "i64",
  "i8",
  "int",
  "isize",
  "long",
  "short",
  "signed",
  "size_t",
  "string",
  "u16",
  "u32",
  "u64",
  "u8",
  "uint16_t",
  "uint32_t",
  "uint64_t",
  "uint8_t",
  "usize",
  "void",
]);

const CODE_LIKE_PATTERN =
  /\b(?:int|char|long|unsigned|return|fn|let|mut|struct|impl|use|const|void|class|function)\b|[{};]/;
const TOKEN_PATTERN =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b0x[\da-fA-F]+(?:UL|ULL|L|U)?\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:UL|ULL|L|U|f)?\b|\b[A-Za-z_]\w*\b|[{}()[\];,.=*+\-/<>:&|!%^~?]+)/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokenClass(token: string, nextToken: string): string {
  if (token.startsWith("//") || token.startsWith("/*")) return "reader-token-comment";
  if (token.startsWith("\"") || token.startsWith("'")) return "reader-token-string";
  if (/^(?:0x[\da-fA-F]+|\d)/.test(token)) return "reader-token-number";
  if (CODE_KEYWORDS.has(token)) return "reader-token-keyword";
  if (CODE_TYPES.has(token)) return "reader-token-type";
  if (/^[A-Za-z_]\w*$/.test(token) && nextToken.trimStart().startsWith("(")) {
    return "reader-token-function";
  }
  if (/^[{}()[\];,.=*+\-/<>:&|!%^~?]+$/.test(token)) return "reader-token-punctuation";
  return "";
}

function highlightCodeText(text: string): string {
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_PATTERN.exec(text)) !== null) {
    const token = match[0];
    const nextToken = text.slice(TOKEN_PATTERN.lastIndex);
    const className = tokenClass(token, nextToken);

    html += escapeHtml(text.slice(lastIndex, match.index));
    html += className
      ? `<span class="${className}">${escapeHtml(token)}</span>`
      : escapeHtml(token);
    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  html += escapeHtml(text.slice(lastIndex));
  return html;
}

export function highlightEpubCodeBlocks(doc: Document): number {
  const codeBlocks = Array.from(doc.querySelectorAll("pre"));
  let highlightedCount = 0;

  for (const block of codeBlocks) {
    const pre = block as HTMLElement;
    if (pre.dataset.readerCodeHighlighted === "1") continue;

    const text = pre.textContent || "";
    if (!CODE_LIKE_PATTERN.test(text)) continue;

    pre.innerHTML = highlightCodeText(text);
    pre.dataset.readerCodeHighlighted = "1";
    highlightedCount += 1;
  }

  return highlightedCount;
}
