/** Shared presentation policy. Never apply the normalizer to source evidence,
 * structured extraction, machine protocols or human-approved decisions. */
export const ANHAM_RESPONSE_STYLE = `
Единый стиль ответов Анхама / Anham response style.
Write naturally, like a thoughtful person, in a calm, warm and respectful tone. Use short paragraphs and ordinary sentences. Match the active Russian or English locale. For enumeration use a sentence or separate short paragraphs. Do not output Markdown, asterisks for emphasis, hash headings, bullet or numbered lists, tables, code fences, decorative headings, or em dashes. Use full sentences to introduce a topic instead of a heading. This applies equally to public chat, registered and paid clients, the cabinet, Anna, Karen, analytical explanations and reviews.
Пиши естественно, спокойно и бережно, короткими абзацами, без канцелярита. Никаких звёздочек для выделения, решёток-заголовков, маркированных или нумерованных списков, таблиц, блоков кода, декоративных заголовков и длинного тире. Перечисляй обычным предложением или несколькими короткими абзацами. Это правило формы действует и для подробного рабочего разбора.
Keep every relevant fact, number, sign, decimal separator, unit, reference interval, date, source reference and URL accurate. Never shorten an analysis by dropping evidence, conflicting readings or uncertainty. Preserve medically meaningful symbols and identifiers. Clearly distinguish source data, an observed pattern, a hypothesis, and a human decision in ordinary words. For example: “The document records ...” and “One possible explanation, requiring Karen's review, is ...”; «В документе указано ...» и «Возможное объяснение, которое требует проверки Karen, ...». Do not turn missing or review-only evidence into a verified fact. Style does not change medical boundaries, emergency instructions, role permissions or the requirement for Karen's approval.
This policy controls human-readable prose only. Preserve explicitly required machine JSON keys, protocol separators and extraction/source text exactly; apply the prose style inside designated narrative fields. Formatting examples in context or knowledge are not a request to reproduce their layout.`;

export function withAnhamResponseStyle(prompt: string): string {
  return `${prompt}\n\n${ANHAM_RESPONSE_STYLE}`;
}

/** Conservative Markdown-to-prose conversion, after complete provider output
 * and (where needed) protocol parsing. No inference, translation or truncation. */
export function normalizeAnhamResponse(raw: string, locale?: "ru" | "en"): string {
  // Explicit surface/field locale wins; legacy callers can infer from prose.
  const russian = locale ? locale === "ru" : /[а-яё]/i.test(raw);
  // A number followed by a unit may be a measurement with a trailing decimal
  // point, not an ordered-list index. Recognize SI prefixes and ratio units;
  // in ambiguous cases keep the number rather than improve formatting.
  const startsUnit = (value: string) => /^(?:(?:[yzafpnµμumcdhkMGTPEZY]?(?:mol|kat|IU|U|g|L|l|m|s|Hz|Pa|K)|mmHg|°[CF]|%|мг|г|кг|ммоль|мл|л|МЕ)(?![\p{L}\p{N}_])|[\p{L}µμ]+[/·][\p{L}µμ])/u.test(value);
  // Collision-free placeholders protect literal URLs, filenames and operators.
  let prefix = "\uE000";
  while (raw.includes(prefix)) prefix += "\uE000";
  const literals: string[] = [];
  const protect = (value: string) => `${prefix}${literals.push(value) - 1}\uE001`;
  const restore = (value: string) => value.replace(new RegExp(`${prefix}(\\d+)\uE001`, "g"), (_match, index: string) => literals[Number(index)]);
  // Protected scientific notation must still count as a number when deciding
  // whether a leading minus/comparator is literal. Inspect without rewriting.
  const startsMeasurement = (value: string) => /^(?:[+−±-]?[ \t]*(?:\d|[.,]\d)|[<>=≤≥≠≈∼~])/.test(restore(value));
  let text = raw.replace(/\r\n?/g, "\n");

  const references = new Map<string, string>();
  text = text.replace(/^[ \t]{0,3}\[([^\]\n]+)\]:[ \t]*(\S+)(?:[ \t]+["'].*["'])?[ \t]*$/gm,
    (_line, label: string, url: string) => {
      references.set(label.toLowerCase(), url.replace(/^<|>$/g, ""));
      // Keep the destination even if a malformed/unmatched reference follows.
      return protect(url.replace(/^<|>$/g, ""));
    });
  text = text.replace(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g,
    (match, label: string, id: string) => {
      const url = references.get((id || label).toLowerCase());
      return url ? `${label} (${protect(url)})` : match;
    });
  text = text.replace(/\[([^\]\n]+)\](?!\()/g, (match, label: string) => {
    const url = references.get(label.toLowerCase());
    return url ? `${label} (${protect(url)})` : match;
  });

  // Inline links may contain balanced parentheses in the destination.
  let linked = "";
  let cursor = 0;
  const links = /!?\[([^\]\n]+)\]\(/g;
  for (let match = links.exec(text); match; match = links.exec(text)) {
    let end = links.lastIndex;
    let depth = 1;
    for (; end < text.length && text[end] !== "\n"; end++) {
      if (text[end] === "\\") { end++; continue; }
      if (text[end] === "(") depth++;
      if (text[end] === ")" && --depth === 0) break;
    }
    if (depth !== 0) continue;
    const target = text.slice(links.lastIndex, end).trim();
    const url = target.replace(/[ \t]+["'][^\n]*["']$/, "").replace(/^<|>$/g, "");
    if (!url) continue;
    linked += text.slice(cursor, match.index) + `${match[1]} (${protect(url)})`;
    cursor = end + 1;
    links.lastIndex = cursor;
  }
  text = linked + text.slice(cursor);
  text = text.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (_match, url: string) => protect(url));
  text = text.replace(/(?:https?:\/\/|mailto:|www\.|(?<![\p{L}\p{N}])\/(?!\/|\s))[^\s<>]+/gu, (url) => {
    // Emphasis around a URL is presentation; punctuation inside it is literal.
    const suffix = url.match(/(?:\*{1,3}|_{1,3}|`+|[.,;!?])+$/)?.[0] ?? "";
    return protect(url.slice(0, url.length - suffix.length)) + suffix;
  });
  // Escaped presentation markers follow the same rule; literal table pipes
  // are protected so they cannot manufacture extra columns.
  text = text.replace(/\\([\\`*_[\]{}()#+.!|>~-])/g, (_match, value: string) => value === "|" ? protect(value) : value);
  text = text.replace(/(?<![\p{L}\p{N}_.-])[\p{L}\p{N}_][\p{L}\p{N}_.-]*\.(?:pdf|png|jpe?g|docx?|txt|csv|xlsx?)\b/giu, protect);
  text = text.replace(/\b\d+(?:[.,]\d+)?[ \t]*\*[ \t]*10(?:\^|\*\*)[+-]?\d+/g, protect);

  // Remove fence delimiters, keeping their entire contents as plain text.
  text = text.replace(/^[ \t]*(?:`{3,}|~{3,})[^\n]*$/gm, "");
  text = text.replace(/(`+)([^`\n]+)\1/g, (_match, _ticks: string, value: string) => value.replace(/\|/g, protect));
  // Resolve thematic breaks before paired emphasis can mistake *** for *text*.
  text = text.replace(/^[ \t]*(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/gm, "");
  // Paired emphasis only: standalone clinical flags and multiplication survive.
  for (const marker of ["***", "___", "**", "__", "*", "_"]) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=\\S)([^\\n]+?\\S|\\S)${escaped}(?![\\p{L}\\p{N}_])`, "gu");
    text = text.replace(pattern, "$1$2");
  }
  // Strikethrough can revoke a statement. Do not silently endorse its text.
  text = text.replace(/~~([^\n]+?)~~/g, (_match, value: string) =>
    russian ? `(зачёркнуто: ${value})` : `(struck out: ${value})`);

  const lines = text.split("\n");
  const output: string[] = [];
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only a real Markdown separator establishes column associations.
    if (line.includes("|") && i + 1 < lines.length) {
      const headers = cells(line);
      const separators = cells(lines[i + 1]);
      if (headers.length > 1 && separators.length === headers.length && separators.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        i += 2;
        let rows = 0;
        while (i < lines.length && lines[i].includes("|")) {
          const values = cells(lines[i]);
          // A malformed row keeps every cell without inventing alignment.
          if (values.length !== headers.length) output.push(headers.join("; "));
          output.push(values.length === headers.length
            ? values.map((value, index) => `${headers[index]}: ${value}`).join("; ")
            : values.join("; "), "");
          rows++;
          i++;
        }
        if (!rows) output.push(headers.join("; "), "");
        i--;
        continue;
      }
    }
    if (/^[ \t]*(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|={3,})$/.test(line)) {
      output.push("");
      continue;
    }
    let clean = line.trim();
    // > 5, >= 5 and > -0.1 are medical comparisons, not block quotes.
    const quote = /^(?:>[ \t]+)+/.exec(clean);
    if (quote && !startsMeasurement(clean.slice(quote[0].length).trimStart())) {
      clean = clean.slice(quote[0].length);
    }
    clean = clean.replace(/^#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?$/, "$1");
    const list = /^(?:[-+*•●▪◦][ \t]+|\d{1,3}[.)][ \t]+)(.+)$/.exec(clean);
    // Ambiguous numeric signs and measurements stay literal.
    if (list && (!/^[+-]/.test(clean) || !startsMeasurement(list[1])) && !startsUnit(list[1])) {
      clean = list[1];
      output.push("");
    }
    // A task checkbox is stated in words, preserving completion meaning.
    clean = clean.replace(/^\[([ xX])\][ \t]+/, (_match, checked: string) => {
      return checked.trim() ? (russian ? "Выполнено: " : "Completed: ") : (russian ? "Не выполнено: " : "Not completed: ");
    });
    output.push(clean);
  }
  text = output.join("\n")
    .replace(/(?<=\d)[ \t]*—[ \t]*(?=[+−\-]?(?:\d|[.,]\d))/g, "-")
    .replace(/(^|[\s(:=<>])—[ \t]*(?=\d|[.,]\d)/g, "$1−")
    .replace(/[ \t]*—[ \t]*/g, ", ")
    .replace(/([.,:;!?])[ \t]*,(?!\d)/g, "$1")
    .replace(/^,(?![ \t]*\d)[ \t]*/gm, "")
    .replace(/\n{3,}/g, "\n\n").trim();
  // Restore once, after every formatting operation. No literal is re-parsed.
  return restore(text);
}
