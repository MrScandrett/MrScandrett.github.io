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
  if (!items.length || !Array.isArray(items[0])) {
    throw new Error("ELIZA script must begin with an opening phrase in parentheses, e.g. (HOW DO YOU DO).");
  }
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
          const left = form.slice(0, eq);
          return {
            decomposition: left.map(toPatternTerm),
            decompositionText: `(${left.map((t) => (Array.isArray(t) ? `(${t.join(" ")})` : t)).join(" ")})`,
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

export function computeSlipHashInfo(rawWord) {
  const tokens = elizaUppercase(String(rawWord || ""))
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const word = tokens.length ? tokens[tokens.length - 1] : "";
  const start = word.length ? Math.floor((word.length - 1) / 6) * 6 : 0;
  const chunk = word.slice(start).padEnd(6, " ").slice(0, 6);
  const bcdChars = [...chunk].map((ch) => {
    const code = TO_BCD.has(ch) ? TO_BCD.get(ch) : ch.charCodeAt(0) & 0x3f;
    return {
      char: ch,
      code,
      octal: code.toString(8).padStart(2, "0"),
      bits: code.toString(2).padStart(6, "0")
    };
  });
  const bcdWord = lastChunkAsBcd(word);
  return {
    word,
    chunk,
    bcdChars,
    word36Octal: bcdWord.toString(8).padStart(12, "0"),
    word36Binary: bcdWord.toString(2).padStart(36, "0").match(/.{1,6}/g).join(" "),
    hashIndex: slipHash(bcdWord, 2)
  };
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

function formatPatternTerm(term) {
  if (typeof term === "string") return term;
  if (term && term.any) return `(* ${term.any.join(" ")})`;
  if (term && term.tags) return `(/${term.tags.join(" ")})`;
  return String(term);
}

function splitTrailingClauses(tokens) {
  const out = [];
  let buf = [];
  for (const tok of tokens) {
    if (DELIMITERS.includes(tok)) {
      if (buf.length) {
        out.push({
          tokens: buf.slice(),
          text: buf.join(" "),
          delimiter: tok,
          kept: false,
          reason: "discarded-after-delimiter"
        });
        buf = [];
      }
    } else {
      buf.push(tok);
    }
  }
  if (buf.length) {
    out.push({
      tokens: buf.slice(),
      text: buf.join(" "),
      delimiter: null,
      kept: false,
      reason: "discarded-after-delimiter"
    });
  }
  return out;
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
    return { item: transform.reassembly[i], index: i };
  }

  function createMemory(keyword, words, trace) {
    const mem = script.memory;
    if (!mem || keyword !== mem.keyword || !words.length) return;
    const lastWord = words[words.length - 1];
    const hashInfo = computeSlipHashInfo(lastWord);
    const transform = mem.transforms[hashInfo.hashIndex];
    const parts = match(transform.decomposition, words, script.tags);
    if (!parts) return;
    const text = reassemble(transform.reassembly, parts).join(" ");
    memories.push(text);
    trace.memorySaved = {
      keyword,
      lastWord,
      hashInfo,
      decompositionText: transform.decompositionText,
      reassemblyText: `(${transform.reassembly.join(" ")})`,
      parts: parts.slice(),
      text
    };
    trace.steps.push(`Saved to MEMORY: "${text}"`);
  }

  function respond(input) {
    const initialTokens = splitInput(input);
    const limitBefore = limit;
    limit = (limit % 4) + 1;
    const trace = {
      rawInput: input,
      normalizedTokens: initialTokens.slice(),
      clauses: [],
      scanTokens: [],
      keystack: [],
      keystackDetail: [],
      substitutions: [],
      steps: [],
      source: "",
      clause: "",
      parts: [],
      limitBefore,
      limitAfter: limit,
      memorySaved: null,
      memoryRecalled: null,
      attempts: [],
      winningAttempt: null,
      noneAttempt: null,
      memoriesAfter: memories.slice()
    };

    let words = initialTokens.slice();
    let origWords = initialTokens.slice();

    // scan for keywords, keep one clause, apply word substitutions
    const keystack = [];
    let topRank = 0;
    let scanTokens = [];
    let brokeOnDelimiter = false;
    for (let i = 0; i < words.length; ) {
      const word = words[i];
      if (DELIMITERS.includes(word)) {
        if (!keystack.length) {
          trace.clauses.push({
            tokens: origWords.slice(0, i),
            text: origWords.slice(0, i).join(" "),
            delimiter: word,
            kept: false,
            reason: "skipped-no-keyword"
          });
          scanTokens = [];
          words = words.slice(i + 1);
          origWords = origWords.slice(i + 1);
          i = 0;
          continue;
        }
        trace.clauses.push({
          tokens: origWords.slice(0, i),
          text: origWords.slice(0, i).join(" "),
          delimiter: word,
          kept: true,
          reason: "selected"
        });
        trace.clauses.push(...splitTrailingClauses(origWords.slice(i + 1)));
        words = words.slice(0, i);
        brokeOnDelimiter = true;
        break;
      }
      const rule = script.rules.get(word);
      let stackRole = "none";
      if (rule) {
        if (rule.transforms.length || rule.link) {
          if (rule.precedence > topRank) {
            keystack.unshift(word);
            topRank = rule.precedence;
            stackRole = "top";
          } else {
            keystack.push(word);
            stackRole = "bottom";
          }
        }
        if (rule.substitute) {
          trace.substitutions.push({ from: word, to: rule.substitute });
          words[i] = rule.substitute;
        }
      }
      scanTokens.push({
        index: i,
        original: origWords[i],
        finalWord: words[i],
        substituted: Boolean(rule && rule.substitute),
        ruleFound: Boolean(rule),
        precedence: rule ? rule.precedence : 0,
        stackRole,
        tags: rule ? rule.tags.slice() : []
      });
      i += 1;
    }

    if (!brokeOnDelimiter) {
      if (keystack.length) {
        trace.clauses.push({
          tokens: origWords.slice(),
          text: origWords.join(" "),
          delimiter: null,
          kept: true,
          reason: "selected"
        });
      } else if (origWords.length) {
        trace.clauses.push({
          tokens: origWords.slice(),
          text: origWords.join(" "),
          delimiter: null,
          kept: false,
          reason: "skipped-no-keyword"
        });
      }
    }

    trace.scanTokens = scanTokens;
    trace.keystackDetail = keystack.map((k) => ({
      keyword: k,
      precedence: script.rules.get(k).precedence
    }));
    trace.keystack = keystack.map((k) => `${k}(${script.rules.get(k).precedence})`);
    trace.clause = words.join(" ");

    if (!keystack.length && limit === 4 && memories.length) {
      const text = memories.shift();
      trace.source = "MEMORY";
      trace.memoryRecalled = { text, remainingCount: memories.length };
      trace.memoriesAfter = memories.slice();
      trace.steps.push("No keywords, and the LIMIT counter is 4, so ELIZA recalls the oldest MEMORY.");
      return { text, trace };
    }

    while (keystack.length) {
      const keyword = keystack.shift();
      const rule = script.rules.get(keyword);
      if (!rule) {
        trace.source = "NOMATCH";
        trace.memoriesAfter = memories.slice();
        return { text: NOMATCH[limit - 1], trace };
      }

      createMemory(keyword, words, trace);

      const transform = rule.transforms.find((t) => (t.parts = match(t.decomposition, words, script.tags)));
      if (!transform) {
        if (rule.link) {
          trace.attempts.push({
            keyword,
            precedence: rule.precedence,
            matched: false,
            decompositionText: null,
            decompositionTerms: [],
            parts: [],
            reassemblyKind: "link",
            reassemblyText: `(=${rule.link})`,
            reassemblyIndex: null,
            reassemblyTotal: 0,
            reassemblyChoices: [],
            linkTarget: rule.link,
            preWords: null,
            outputWords: null
          });
          trace.steps.push(`${keyword}: no decomposition matched; follows link (=${rule.link})`);
          keystack.unshift(rule.link);
          continue;
        }
        trace.attempts.push({
          keyword,
          precedence: rule.precedence,
          matched: false,
          decompositionText: null,
          decompositionTerms: [],
          parts: [],
          reassemblyKind: "nomatch",
          reassemblyText: NOMATCH[limit - 1],
          reassemblyIndex: null,
          reassemblyTotal: 0,
          reassemblyChoices: [],
          linkTarget: null,
          preWords: null,
          outputWords: [NOMATCH[limit - 1]]
        });
        trace.source = "NOMATCH";
        trace.memoriesAfter = memories.slice();
        trace.steps.push(`${keyword}: no decomposition matched; built-in message by LIMIT`);
        return { text: NOMATCH[limit - 1], trace };
      }

      const { item: reassembly, index: reassemblyIndex } = nextReassembly(transform);
      const clonedParts = transform.parts.slice();
      trace.steps.push(`${keyword}: decomposition ${transform.decompositionText} -> reassembly ${reassembly.text}`);
      trace.parts = clonedParts;

      const attempt = {
        keyword,
        precedence: rule.precedence,
        matched: true,
        decompositionText: transform.decompositionText,
        decompositionTerms: transform.decomposition.map(formatPatternTerm),
        parts: clonedParts,
        reassemblyKind: reassembly.kind,
        reassemblyText: reassembly.text,
        reassemblyIndex,
        reassemblyTotal: transform.reassembly.length,
        reassemblyChoices: transform.reassembly.map((r) => r.text),
        linkTarget: null,
        preWords: null,
        outputWords: null
      };

      if (reassembly.kind === "words") {
        const outWords = reassemble(reassembly.words, clonedParts);
        attempt.outputWords = outWords.slice();
        trace.attempts.push(attempt);
        trace.winningAttempt = attempt;
        trace.source = keyword;
        trace.memoriesAfter = memories.slice();
        return { text: outWords.join(" "), trace };
      }
      if (reassembly.kind === "link") {
        attempt.linkTarget = reassembly.keyword;
        trace.attempts.push(attempt);
        keystack.unshift(reassembly.keyword);
        continue;
      }
      if (reassembly.kind === "pre") {
        const nextWords = reassemble(reassembly.words, clonedParts);
        attempt.linkTarget = reassembly.keyword;
        attempt.preWords = nextWords.slice();
        trace.attempts.push(attempt);
        words = nextWords;
        keystack.unshift(reassembly.keyword);
        continue;
      }
      trace.attempts.push(attempt);
      // NEWKEY: try the next keyword on the stack
      if (!keystack.length) break;
    }

    // no usable keyword: the NONE rule never fails
    if (!script.none || !script.none.transforms.length) {
      trace.source = "NOMATCH";
      trace.memoriesAfter = memories.slice();
      return { text: NOMATCH[limit - 1], trace };
    }
    const none = script.none.transforms[0];
    const { item: reassembly, index: noneIndex } = nextReassembly(none);
    const outWords = reassemble(reassembly.words, []);
    trace.source = "NONE";
    trace.noneAttempt = {
      keyword: "NONE",
      precedence: 0,
      matched: true,
      decompositionText: none.decompositionText,
      decompositionTerms: none.decomposition.map(formatPatternTerm),
      parts: [],
      reassemblyKind: reassembly.kind,
      reassemblyText: reassembly.text,
      reassemblyIndex: noneIndex,
      reassemblyTotal: none.reassembly.length,
      reassemblyChoices: none.reassembly.map((r) => r.text),
      linkTarget: null,
      preWords: null,
      outputWords: outWords.slice()
    };
    trace.memoriesAfter = memories.slice();
    trace.steps.push(`No keyword applied; NONE rule reply ${reassembly.text}`);
    return { text: outWords.join(" "), trace };
  }

  function getRuleList() {
    const list = [];
    for (const rule of script.rules.values()) {
      list.push({
        keyword: rule.keyword,
        precedence: rule.precedence,
        substitute: rule.substitute,
        tags: rule.tags.slice(),
        link: rule.link,
        transforms: rule.transforms.map((t) => ({
          decompositionText: t.decompositionText,
          cursor: cursors.get(t) || 0,
          reassembly: t.reassembly.map((r) => r.text)
        }))
      });
    }
    if (script.none) {
      list.push({
        keyword: "NONE",
        precedence: -1,
        substitute: null,
        tags: [],
        link: null,
        transforms: script.none.transforms.map((t) => ({
          decompositionText: t.decompositionText,
          cursor: cursors.get(t) || 0,
          reassembly: t.reassembly.map((r) => r.text)
        }))
      });
    }
    return list.sort((a, b) => (b.precedence - a.precedence) || a.keyword.localeCompare(b.keyword));
  }

  return {
    opening: script.opening,
    respond,
    get memories() {
      return memories.slice();
    },
    get limit() {
      return limit;
    },
    get script() {
      return script;
    },
    getCursor(transform) {
      return cursors.get(transform) || 0;
    },
    getRuleList
  };
}
