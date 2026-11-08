/**
 * Pull the first JSON object out of a model reply. Handles <think> blocks, ```json fences,
 * prose before/after, and the two mistakes models make most: // comments and trailing commas.
 * Pure: no Nuxt imports, unit-tested directly.
 */

/** Remove // and /* *\/ comments that are outside of strings. */
function stripComments(s: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i++;
      } else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && next === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i++;
    } else out += ch;
  }
  return out;
}

/** Remove commas directly before } or ] (outside strings). */
function stripTrailingCommas(s: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += s[i + 1] ?? '';
        i++;
      } else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    if (ch === ',') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j] ?? '')) j++;
      if (s[j] === '}' || s[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}

/** Find the balanced {...} starting at the first '{' (string-aware). */
function firstObject(s: string): string {
  const start = s.indexOf('{');
  if (start < 0) throw new Error('no JSON object in reply');
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return s.slice(start, i + 1);
  }
  throw new Error('unterminated JSON object in reply (reply cut off?)');
}

export function extractJson(text: string): unknown {
  const cleaned = stripComments(
    text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*$/i, '') // unclosed think block: drop the rest
      .replace(/```(?:json)?/gi, '')
  ).trim();
  const candidate = firstObject(cleaned);
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(stripTrailingCommas(candidate));
    } catch (e) {
      throw new Error(`reply isn't valid JSON: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }
  }
}
