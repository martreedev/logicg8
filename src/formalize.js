// Formalize: turn highlighted phrases of a natural-language argument into a
// propositional formula per line, then check validity by truth table.
//
// Input is the document text plus "spans": { id, start, end, name, negated }
// where the user assigned text[start..end) to variable `name` (or to ¬name).
// Connectives are read from the words around/inside the spans (if/then/or/
// and/only if/iff/unless/not) and from symbols already typed (∧ ∨ ¬ ⇒ ↔).
//
// It also checks the wording: a phrase assigned to ¬P must actually negate
// P's phrase. "gets its existence from another" is not the negation of
// "gets its existence from itself" (both can be false), so the argument is
// re-checked with that phrase as its own variable — exposing a false dichotomy.
(function (root) {
  'use strict';

  const LABEL = /^\s*(?:(P\d*|premise\s*\d*)|(C\d*|conclusion))\s*[.:)]\s*/i;
  const CONCLUSION_LEAD = /^\s*(?:∴|therefore|thus|hence|so|consequently|it follows that)\b[\s,:]*/i;
  // Words at the start of a selected phrase that are connectives, not content.
  const LEAD_WORD = /^\s*(?:if and only if|only if|iff|if|then|either|whether|or|and|but|unless|so|therefore|thus|hence|∴)\b[\s,]*/i;
  const NEGATORS = new Set(['not', 'no', 'never', 'nothing', 'none']);
  // Filler that differs between a phrase and its paraphrase/negation without
  // changing what it says ("it is not the case that it is wet").
  const FILLER = new Set(['a', 'an', 'the', 'it', 'its', 'they', 'them', 'he', 'she', 'this', 'that', 'there',
    'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'case', 'true', 'false',
    'either', 'or', 'and', 'whether', 'if', 'then', 'so']);
  const FRESH_NAMES = 'PQRSTUVWXYZABCDEFGHJKLMNO'.split('');
  const MAX_VARS = 16;

  // ---- wording -------------------------------------------------------------

  function words(text) {
    return text.toLowerCase()
      .replace(/can['’]t/g, 'can not').replace(/won['’]t/g, 'will not').replace(/n['’]t\b/g, ' not')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(Boolean);
  }

  function stem(w) {
    if (w.length > 4) {
      return w.replace(/(ing|ed|es|s)$/, '');
    }
    return w.length > 3 ? w.replace(/s$/, '') : w;
  }

  // { neg: number of negators, content: Set of stemmed content words }
  function profile(text) {
    let neg = 0;
    const content = new Set();
    for (const w of words(text)) {
      if (NEGATORS.has(w)) {
        neg += 1;
      } else if (!FILLER.has(w)) {
        content.add(stem(w));
      }
    }
    return { neg, content };
  }

  // Same content, allowing one side to drop a short subject
  // ("whatever exists gets X" vs "it does not get X").
  function sameContent(a, b) {
    const [small, big] = a.size <= b.size ? [a, b] : [b, a];
    for (const w of small) {
      if (!big.has(w)) {
        return false;
      }
    }
    return small.size > 0 && big.size - small.size <= 2;
  }

  function isNegationOf(base, candidate) {
    const a = profile(base);
    const b = profile(candidate);
    return a.neg % 2 !== b.neg % 2 && sameContent(a.content, b.content);
  }

  function isSameAs(base, candidate) {
    const a = profile(base);
    const b = profile(candidate);
    return a.neg % 2 === b.neg % 2 && sameContent(a.content, b.content);
  }

  function cleanPhrase(text) {
    let rest = text;
    const lead = [];
    let m;
    while ((m = LEAD_WORD.exec(rest)) && m[0]) {
      lead.push(m[0]);
      rest = rest.slice(m[0].length);
    }
    // "either" is only ever a connective ("X either does A, or B").
    const core = rest.replace(/\beither\s+/gi, '').replace(/[\s,.;:!?]+$/, '').trim();
    return { lead: lead.join(' '), core };
  }

  // Normalised connective words: " if then not "; symbols count as words.
  function leadOf(text) {
    const t = ` ${text.toLowerCase()
      .replace(/∧/g, ' and ').replace(/∨/g, ' or ').replace(/[¬~!]/g, ' not ')
      .replace(/⇒|→|->/g, ' then ').replace(/↔|⇔|<->/g, ' iff ')
      .replace(/n['’]t\b/g, ' not').replace(/[^a-z\s]/g, ' ')
      .replace(/\bif and only if\b/g, 'iff').replace(/\bonly if\b/g, 'onlyif')
      .replace(/\bit is (?:not the case|false) that\b/g, 'not')
      .replace(/\bimplies\b/g, 'then')} `;
    return t.replace(/\s+/g, ' ');
  }

  const has = (lead, word) => lead.includes(` ${word} `);
  const negatedLead = (lead) => has(lead, 'not') || has(lead, 'no') || has(lead, 'never');

  // ---- formulas ------------------------------------------------------------

  const PREC = { iff: 0, imp: 1, or: 2, and: 3, not: 4, var: 5 };
  const OP = { iff: ' ↔ ', imp: ' ⇒ ', or: ' ∨ ', and: ' ∧ ' };

  function show(node) {
    if (node.type === 'var') {
      return node.name;
    }
    if (node.type === 'not') {
      const inner = show(node.a);
      return PREC[node.a.type] < PREC.not ? `¬(${inner})` : `¬${inner}`;
    }
    const wrap = (child, right) => {
      const s = show(child);
      const p = PREC[child.type];
      const assoc = node.type === 'and' || node.type === 'or' || (node.type === 'imp' && right);
      return p < PREC[node.type] || (p === PREC[node.type] && !(assoc && child.type === node.type)) ? `(${s})` : s;
    };
    return wrap(node.a, false) + OP[node.type] + wrap(node.b, true);
  }

  function evaluate(node, env) {
    switch (node.type) {
      case 'var': return env[node.name];
      case 'not': return !evaluate(node.a, env);
      case 'and': return evaluate(node.a, env) && evaluate(node.b, env);
      case 'or': return evaluate(node.a, env) || evaluate(node.b, env);
      case 'imp': return !evaluate(node.a, env) || evaluate(node.b, env);
      default: return evaluate(node.a, env) === evaluate(node.b, env);
    }
  }

  // Replace the nodes made from a span (P, or ¬P for a span assigned to ¬P).
  function mapSpans(node, fn) {
    if (node.occ) {
      return fn(node);
    }
    if (node.type === 'var') {
      return node;
    }
    return { ...node, a: mapSpans(node.a, fn), b: node.b && mapSpans(node.b, fn) };
  }

  function collectVars(node, out) {
    if (node.type === 'var') {
      out.add(node.name);
    } else {
      collectVars(node.a, out);
      if (node.b) {
        collectVars(node.b, out);
      }
    }
    return out;
  }

  // items: [{ lead, node }] in reading order; returns one formula.
  function build(items, notes) {
    if (items.length === 1) {
      return negatedLead(items[0].lead) ? { type: 'not', a: items[0].node } : items[0].node;
    }
    const at = (word) => items.findIndex((item, i) => i > 0 && has(item.lead, word));
    const keepNot = (item) => ({ ...item, lead: negatedLead(item.lead) ? ' not ' : ' ' });
    const split = (k, type, swap) => {
      const left = build([keepNot(items[0]), ...items.slice(1, k)], notes);
      const right = build([keepNot(items[k]), ...items.slice(k + 1)], notes);
      return swap ? { type, a: right, b: left } : { type, a: left, b: right };
    };
    let k;
    if ((k = at('iff')) > 0) return split(k, 'iff');
    if ((k = at('then')) > 0) return split(k, 'imp');
    if ((k = at('onlyif')) > 0) return split(k, 'imp');
    if (has(items[0].lead, 'if')) return split(items.length - 1, 'imp'); // "If A, B"
    if ((k = at('if')) > 0) return split(k, 'imp', true);                  // "B if A"
    if ((k = at('or')) > 0) return split(k, 'or');
    if ((k = at('unless')) > 0) return split(k, 'or');
    if ((k = at('and')) > 0 || (k = at('but')) > 0) return split(k, 'and');
    notes.push('no connective found between phrases; assumed "and"');
    return split(1, 'and');
  }

  // ---- analysis ------------------------------------------------------------

  function check(premises, conclusion) {
    const names = new Set();
    for (const f of [...premises, conclusion]) {
      collectVars(f, names);
    }
    const vars = [...names];
    if (vars.length > MAX_VARS) {
      return { tooMany: true, vars };
    }
    let counterexample = null;
    let consistent = false;
    for (let bits = 0; bits < 1 << vars.length; bits += 1) {
      const env = {};
      vars.forEach((v, i) => { env[v] = Boolean(bits & (1 << (vars.length - 1 - i))); });
      if (premises.every((p) => evaluate(p, env))) {
        consistent = true;
        if (!evaluate(conclusion, env)) {
          counterexample = env;
          break;
        }
      }
    }
    return { valid: !counterexample, counterexample, inconsistent: !consistent, vars };
  }

  function isTautology(node) {
    const vars = [...collectVars(node, new Set())];
    if (vars.length > MAX_VARS) {
      return false;
    }
    for (let bits = 0; bits < 1 << vars.length; bits += 1) {
      const env = {};
      vars.forEach((v, i) => { env[v] = Boolean(bits & (1 << i)); });
      if (!evaluate(node, env)) {
        return false;
      }
    }
    return true;
  }

  function analyze(text, spans) {
    const lines = [];
    let offset = 0;
    for (const raw of text.split('\n')) {
      const end = offset + raw.length;
      const mine = spans.filter((s) => s.start >= offset && s.start < end).sort((a, b) => a.start - b.start);
      if (mine.length) {
        lines.push({ raw, offset, spans: mine, number: lines.length });
      }
      offset = end + 1;
    }

    const occurrences = [];
    const warnings = [];
    const formal = lines.map((line) => {
      const label = LABEL.exec(line.raw);
      let bodyStart = label ? label[0].length : 0;
      const concl = CONCLUSION_LEAD.exec(line.raw.slice(bodyStart));
      const conclusion = Boolean((label && label[2]) || concl);
      let cursor = line.offset + bodyStart;
      const notes = [];
      const items = line.spans.map((span) => {
        const gap = span.start > cursor ? text.slice(cursor, span.start) : '';
        const { lead, core } = cleanPhrase(text.slice(span.start, span.end));
        cursor = Math.max(cursor, span.end);
        const occ = { ...span, core, line: line.number };
        occurrences.push(occ);
        const leaf = { type: 'var', name: span.name, occ: span.id };
        return { lead: leadOf(`${gap} ${lead}`), node: span.negated ? { type: 'not', a: leaf, occ: span.id } : leaf };
      });
      // A connective word in a gap that begins with the conclusion marker
      // ("Therefore") is not part of the formula.
      if (concl && items.length) {
        items[0].lead = items[0].lead.replace(/ (?:therefore|thus|hence|so|consequently) /g, ' ');
      }
      const formula = build(items, notes);
      for (const note of notes) {
        warnings.push({ kind: 'connective', line: line.number, message: `Line "${line.raw.trim()}": ${note}.` });
      }
      return {
        label: label ? (label[1] || label[2]).toUpperCase().replace(/\s+/g, '') : '',
        text: line.raw.trim(),
        conclusion,
        formula
      };
    });

    // What each variable means: its first un-negated phrase.
    const variables = [];
    const byName = new Map();
    for (const occ of occurrences) {
      if (!byName.has(occ.name)) {
        const entry = { name: occ.name, phrase: null, negPhrase: null };
        byName.set(occ.name, entry);
        variables.push(entry);
      }
      const entry = byName.get(occ.name);
      if (!occ.negated && !entry.phrase) {
        entry.phrase = occ.core;
      } else if (occ.negated && !entry.negPhrase) {
        entry.negPhrase = occ.core;
      }
    }

    // Wording checks. Flagged ¬P phrases become fresh variables in the
    // "strict" reading.
    const fresh = []; // { name, phrase, of }
    const used = new Set(variables.map((v) => v.name));
    const freshFor = (occ) => {
      const found = fresh.find((f) => f.of === occ.name && isSameAs(f.phrase, occ.core));
      if (found) {
        return { name: found.name, repeat: true };
      }
      const entry = { name: FRESH_NAMES.find((n) => !used.has(n)) || `X${fresh.length + 1}`, phrase: occ.core, of: occ.name };
      used.add(entry.name);
      fresh.push(entry);
      return { name: entry.name, repeat: false };
    };
    const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
    const replace = new Map(); // occ id -> fresh name
    for (const occ of occurrences) {
      const v = byName.get(occ.name);
      if (occ.negated && v.phrase) {
        if (!isNegationOf(v.phrase, occ.core)) {
          const { name, repeat } = freshFor(occ);
          replace.set(occ.id, name);
          if (repeat) {
            continue;
          }
          warnings.push({
            kind: 'dichotomy',
            line: occ.line,
            message: `"${occ.core}" is not the negation of ${occ.name} ("${v.phrase}"). ` +
              `¬${occ.name} means "it is not the case that ${lower(v.phrase)}". Nothing in the wording rules out both ` +
              `being false, so treating them as ${occ.name} and ¬${occ.name} assumes a dichotomy. ` +
              `Strictly, it is a separate claim — call it ${name}.`
          });
        }
      } else if (!occ.negated && v.phrase && occ.core !== v.phrase && !isSameAs(v.phrase, occ.core)) {
        const looksNegated = isNegationOf(v.phrase, occ.core);
        warnings.push({
          kind: looksNegated ? 'negation' : 'equivocation',
          line: occ.line,
          message: looksNegated
            ? `"${occ.core}" reads as the negation of ${occ.name} ("${v.phrase}") — assign it as ¬${occ.name}.`
            : `${occ.name} stands for both "${v.phrase}" and "${occ.core}". Make sure these say the same thing, ` +
              'or the argument may equivocate.'
        });
      } else if (occ.negated && !v.phrase && v.negPhrase && occ.core !== v.negPhrase && !isSameAs(v.negPhrase, occ.core)) {
        warnings.push({
          kind: 'equivocation',
          line: occ.line,
          message: `¬${occ.name} stands for both "${v.negPhrase}" and "${occ.core}". Make sure these say the same thing.`
        });
      }
    }

    for (const line of formal) {
      line.symbolic = show(line.formula);
      line.tautology = !line.conclusion && isTautology(line.formula);
    }

    const premises = formal.filter((l) => !l.conclusion);
    let conclusionLine = formal.find((l) => l.conclusion) || null;
    let implicitConclusion = false;
    if (!conclusionLine && formal.length > 1) {
      conclusionLine = premises.pop();
      implicitConclusion = true;
    }

    const result = conclusionLine
      ? check(premises.map((l) => l.formula), conclusionLine.formula)
      : null;

    let strict = null;
    if (conclusionLine && replace.size) {
      const sub = (f) => mapSpans(f, (n) => (replace.has(n.occ) ? { type: 'var', name: replace.get(n.occ) } : n));
      const strictLines = formal.map((l) => ({ ...l, formula: sub(l.formula) }));
      for (const l of strictLines) {
        l.symbolic = show(l.formula);
        l.tautology = !l.conclusion && isTautology(l.formula);
      }
      const ci = formal.indexOf(conclusionLine);
      strict = {
        lines: strictLines,
        fresh,
        result: check(strictLines.filter((_, i) => i !== ci && !strictLines[i].conclusion).map((l) => l.formula),
          strictLines[ci].formula)
      };
    }

    return { variables, lines: formal, conclusion: conclusionLine, implicitConclusion, result, strict, warnings };
  }

  const api = { analyze, isNegationOf, isSameAs, cleanPhrase, show };
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Formalize = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
