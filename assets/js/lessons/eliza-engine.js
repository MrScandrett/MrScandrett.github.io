// A faithful JavaScript port of Joseph Weizenbaum's 1966 ELIZA algorithm.
//
// It follows the behavior of the original MAD-SLIP program as reconstructed by
// Anthony Hay (https://github.com/anthay/ELIZA), which reproduces the published
// 1966 CACM conversation word for word:
//   - input is cut into clauses at "," "." and "BUT"; only the first clause
//     containing a keyword is kept
//   - keywords are stacked by precedence (rank); the highest is tried first
//   - each decomposition rule cycles through its reassembly rules in order
//   - (=KEY) links, (NEWKEY) and (PRE ...) behave as described in the paper
//   - MEMORY is filled from "MY" sentences, chosen with the original SLIP HASH
//     of the last word, and recalled when the LIMIT counter reaches 4
//   - built-in "no match" messages are chosen by LIMIT, as in the original

const DELIMITERS = [",", ".", "BUT"];
const NOMATCH = ["PLEASE CONTINUE", "HMMM", "GO ON , PLEASE", "I SEE"];

// ---------- script reader (the script is an S-expression) ----------

function tokenize(text) {
  const tokens = [];
  const src = text.replace(/;[^\n]*/g, " ");
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "(" || c === ")") {
      tokens.push(c);
      i += 1;
    } else if (/\s/.test(c)) {
      i += 1;
    } else {
      let j = i;
      while (j < src.length && !/[\s()]/.test(src[j])) j += 1;
      tokens.push(src.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function readLists(tokens) {
  let pos = 0;
  function read() {
    const t = tokens[pos++];
    if (t !== "(") return t;
    const list = [];
    while (tokens[pos] !== ")") {
      if (pos >= tokens.length) throw new Error("ELIZA script: unbalanced parentheses");
      list.push(read());
    }
    pos += 1;
    return list;
  }
  const items = [];
  while (pos < tokens.length) items.push(read());
  return items;
}

const isNum = (s) => typeof s === "string" && /^\d+$/.test(s);

// "(=WHAT)" reads as ["=WHAT"], "(= EVERYONE)" as ["=", "EVERYONE"]
function asReference(list) {
  if (!Array.isArray(list) || list.some(Array.isArray)) return null;
  const joined = list.join(" ");
  const m = /^=\s*(\S+)$/.exec(joined);
  return m ? m[1] : null;
}

// a decomposition group such as (*SAD UNHAPPY) or (/FAMILY)
function toPatternTerm(term) {
  if (!Array.isArray(term)) return term;
  const words = term.join(" ").trim();
  if (words.startsWith("*")) return { any: words.slice(1).trim().split(/\s+/) };
  if (words.startsWith("/")) return { tags: words.slice(1).trim().split(/\s+/) };
  throw new Error(`ELIZA script: bad pattern group (${words})`);
}

function parseReassembly(list) {
  const ref = asReference(list);
  if (ref) return { kind: "link", keyword: ref, text: `(=${ref})` };
  if (list.length === 1 && list[0] === "NEWKEY") return { kind: "newkey", text: "(NEWKEY)" };
  if (list[0] === "PRE") {
    return {
      kind: "pre",
      words: list[1],
      keyword: asReference(list[2]),
      text: `(PRE (${list[1].join(" ")}) (=${asReference(list[2])}))`
    };
  }
  return { kind: "words", words: list, text: `(${list.join(" ")})` };
}

export function parseScript(text) {
  const items = readLists(tokenize(text));
  const opening = items.shift().join(" ");
  if (items[0] === "START") items.shift();

  const rules = new Map();
  let memory = null;
  let none = null;

  for (const item of items) {
    if (!Array.isArray(item) || !item.length) continue;
    const [keyword, ...rest] = item;

    if (keyword === "MEMORY") {
      const [memKeyword, ...forms] = rest;
      memory = {
        keyword: memKeyword,
        transforms: forms.map((form) => {
          const eq = form.indexOf("=");
          return {
            decomposition: form.slice(0, eq).map(toPatternTerm),
            reassembly: form.slice(eq + 1)
          };
        })
      };
      continue;
    }

    const rule = { keyword, substitute: null, tags: [], precedence: 0, transforms: [], link: null };
    let i = 0;
    if (rest[i] === "=") {
      rule.substitute = rest[i + 1];
      i += 2;
    }
    if (rest[i] === "DLIST") {
      rule.tags = rest[i + 1];
      i += 2;
    }
    if (isNum(rest[i])) {
      rule.precedence = Number(rest[i]);
      i += 1;
    }
    for (; i < rest.length; i += 1) {
      const part = rest[i];
      const ref = asReference(part);
      if (ref) {
        rule.link = ref;
      } else if (Array.isArray(part) && Array.isArray(part[0])) {
        rule.transforms.push({
          decomposition: part[0].map(toPatternTerm),
          decompositionText: `(${part[0].map((t) => (Array.isArray(t) ? `(${t.join(" ")})` : t)).join(" ")})`,
          reassembly: part.slice(1).map(parseReassembly)
        });
      }
    }

    if (keyword === "NONE") none = rule;
    else rules.set(keyword, rule);
  }

  // DLIST tags: e.g. tags.FAMILY -> [MOTHER, MOM, DAD, FATHER, ...]
  const tags = {};
  for (const rule of rules.values()) {
    for (let t of rule.tags) {
      if (t === "/") continue;
      if (t.startsWith("/")) t = t.slice(1);
      (tags[t] ||= []).push(rule.keyword);
    }
  }

  return { opening, rules, memory, none, tags };
}

// ---------- pattern matching and reassembly ----------

function inList(word, term, tags) {
  if (term.any) return term.any.includes(word);
  return term.tags.some((tag) => (tags[tag] || []).includes(word));
}

// returns the matched components (one per pattern term) or null
function match(pattern, words, tags) {
  if (!pattern.length) return words.length ? null : [];
  const [term, ...restPattern] = pattern;

  if (isNum(term) && Number(term) === 0) {
    for (let take = 0; take <= words.length; take += 1) {
      const rest = match(restPattern, words.slice(take), tags);
      if (rest) return [words.slice(0, take).join(" "), ...rest];
    }
    return null;
  }
  if (isNum(term)) {
    const n = Number(term);
    if (words.length < n) return null;
    const rest = match(restPattern, words.slice(n), tags);
    return rest ? [words.slice(0, n).join(" "), ...rest] : null;
  }
  if (!words.length) return null;
  const ok = typeof term === "string" ? term === words[0] : inList(words[0], term, tags);
  if (!ok) return null;
  const rest = match(restPattern, words.slice(1), tags);
  return rest ? [words[0], ...rest] : null;
}

function reassemble(template, components) {
  const out = [];
  for (const t of template) {
    if (isNum(t)) {
      const part = components[Number(t) - 1];
      if (part) out.push(...part.split(" ").filter(Boolean));
    } else {
      out.push(t);
    }
  }
  return out;
}

// ---------- the original SLIP HASH, used to pick a MEMORY transformation ----------

// IBM 7090 BCD (Hollerith) character codes; the array index is the code
const BCD = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", null, "=", "'", null, null, null,
  "+", "A", "B", "C", "D", "E", "F", "G", "H", "I", null, ".", ")", null, null, null,
  "-", "J", "K", "L", "M", "N", "O", "P", "Q", "R", null, "$", "*", null, null, null,
  " ", "/", "S", "T", "U", "V", "W", "X", "Y", "Z", null, ",", "(", null, null, null
];
const TO_BCD = new Map(BCD.map((c, i) => [c, i]).filter(([c]) => c !== null));

// the last (up to) six characters of the word, packed as a 36-bit BCD machine word
function lastChunkAsBcd(word) {
  let result = 0n;
  const append = (c) => {
    const code = TO_BCD.has(c) ? TO_BCD.get(c) : c.charCodeAt(0) & 0x3f;
    result = (result << 6n) | BigInt(code);
  };
  const start = word.length ? Math.floor((word.length - 1) / 6) * 6 : 0;
  let count = 0;
  for (const c of word.slice(start)) {
    append(c);
    count += 1;
  }
  while (count++ < 6) append(" ");
  return result;
}

// mid-square hash: the middle n bits of the 35-bit magnitude squared
function slipHash(d, n) {
  const mask64 = (1n << 64n) - 1n;
  let v = d & 0x7ffffffffn;
  v = (v * v) & mask64;
  v >>= BigInt(35 - Math.floor(n / 2));
  return Number(v & ((1n << BigInt(n)) - 1n));
}

// ---------- input handling ----------

function elizaUppercase(text) {
  return text
    .replace(/[’]/g, "'")
    .replace(/[‘`"«»‚-‟‹›¡¿]/g, " ")
    .replace(/[!?]/g, ".")
    .replace(/[:;–—]/g, ",")
    .toUpperCase();
}

function splitInput(text) {
  return elizaUppercase(text)
    .replace(/([,.])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

// ---------- the ELIZA conversation engine ----------

export function createEliza(scriptText) {
  const script = parseScript(scriptText);
  const cursors = new Map(); // decomposition rule -> next reassembly index
  let memories = [];
  let limit = 1;

  function nextReassembly(transform) {
    const i = cursors.get(transform) || 0;
    cursors.set(transform, (i + 1) % transform.reassembly.length);
    return transform.reassembly[i];
  }

  function createMemory(keyword, words, trace) {
    const mem = script.memory;
    if (!mem || keyword !== mem.keyword || !words.length) return;
    const transform = mem.transforms[slipHash(lastChunkAsBcd(words[words.length - 1]), 2)];
    const parts = match(transform.decomposition, words, script.tags);
    if (!parts) return;
    const text = reassemble(transform.reassembly, parts).join(" ");
    memories.push(text);
    trace.steps.push(`Saved to MEMORY: "${text}"`);
  }

  function respond(input) {
    const trace = { keystack: [], substitutions: [], steps: [], source: "" };
    let words = splitInput(input);
    limit = (limit % 4) + 1;

    // scan for keywords, keep one clause, apply word substitutions
    const keystack = [];
    let topRank = 0;
    for (let i = 0; i < words.length; ) {
      const word = words[i];
      if (DELIMITERS.includes(word)) {
        if (!keystack.length) {
          words = words.slice(i + 1);
          i = 0;
          continue;
        }
        words = words.slice(0, i);
        break;
      }
      const rule = script.rules.get(word);
      if (rule) {
        if (rule.transforms.length || rule.link) {
          if (rule.precedence > topRank) {
            keystack.unshift(word);
            topRank = rule.precedence;
          } else {
            keystack.push(word);
          }
        }
        if (rule.substitute) {
          trace.substitutions.push({ from: word, to: rule.substitute });
          words[i] = rule.substitute;
        }
      }
      i += 1;
    }
    trace.keystack = keystack.map((k) => `${k}(${script.rules.get(k).precedence})`);
    trace.clause = words.join(" ");

    if (!keystack.length && limit === 4 && memories.length) {
      const text = memories.shift();
      trace.source = "MEMORY";
      trace.steps.push("No keywords, and the LIMIT counter is 4, so ELIZA recalls the oldest MEMORY.");
      return { text, trace };
    }

    while (keystack.length) {
      const keyword = keystack.shift();
      const rule = script.rules.get(keyword);
      if (!rule) {
        trace.source = "NOMATCH";
        return { text: NOMATCH[limit - 1], trace };
      }

      createMemory(keyword, words, trace);

      const transform = rule.transforms.find((t) => (t.parts = match(t.decomposition, words, script.tags)));
      if (!transform) {
        if (rule.link) {
          trace.steps.push(`${keyword}: no decomposition matched; follows link (=${rule.link})`);
          keystack.unshift(rule.link);
          continue;
        }
        trace.source = "NOMATCH";
        trace.steps.push(`${keyword}: no decomposition matched; built-in message by LIMIT`);
        return { text: NOMATCH[limit - 1], trace };
      }

      const reassembly = nextReassembly(transform);
      trace.steps.push(`${keyword}: decomposition ${transform.decompositionText} -> reassembly ${reassembly.text}`);
      trace.parts = transform.parts;

      if (reassembly.kind === "words") {
        trace.source = keyword;
        return { text: reassemble(reassembly.words, transform.parts).join(" "), trace };
      }
      if (reassembly.kind === "link") {
        keystack.unshift(reassembly.keyword);
        continue;
      }
      if (reassembly.kind === "pre") {
        words = reassemble(reassembly.words, transform.parts);
        keystack.unshift(reassembly.keyword);
        continue;
      }
      // NEWKEY: try the next keyword on the stack
      if (!keystack.length) break;
    }

    // no usable keyword: the NONE rule never fails
    const none = script.none.transforms[0];
    const reassembly = nextReassembly(none);
    trace.source = "NONE";
    trace.steps.push(`No keyword applied; NONE rule reply ${reassembly.text}`);
    return { text: reassemble(reassembly.words, []).join(" "), trace };
  }

  return {
    opening: script.opening,
    respond,
    get memories() {
      return memories.slice();
    }
  };
}
