// node scripts/formalize-check.js — asserts for the formalize engine.
const assert = require('node:assert');
const { analyze, isNegationOf } = require('../src/formalize.js');

let nextId = 0;
function spans(text, picks) {
  let from = 0;
  return picks.map(([phrase, name, negated = false]) => {
    const start = text.indexOf(phrase, from);
    assert(start !== -1, phrase);
    from = start + phrase.length;
    return { id: `s${nextId++}`, start, end: start + phrase.length, name, negated };
  });
}

// Modus ponens.
const mp = 'P1. If it rains, then it is wet\nP2. It rained\nC. Therefore, it is wet';
let r = analyze(mp, spans(mp, [['If it rains', 'P'], ['then it is wet', 'Q'], ['It rained', 'P'], ['it is wet', 'Q']]));
assert.deepStrictEqual(r.lines.map((l) => l.symbolic), ['P ⇒ Q', 'P', 'Q']);
assert.strictEqual(r.result.valid, true);
assert.strictEqual(r.warnings.length, 0, JSON.stringify(r.warnings));

// Affirming the consequent.
const ac = 'P1. If it rains, then it is wet\nP2. It is wet\nC. Therefore, it rained';
r = analyze(ac, spans(ac, [['If it rains', 'P'], ['then it is wet', 'Q'], ['It is wet', 'Q'], ['it rained', 'P']]));
assert.strictEqual(r.result.valid, false);
assert.deepStrictEqual(r.result.counterexample, { P: false, Q: true });

// False dichotomy: "from itself" / "from another" are not P / ¬P.
const fd = 'P1. Whatever exists either gets its existence from itself, or it gets its existence from another\n' +
  'P2. Nothing gets its existence from itself\nC. Therefore, whatever exists gets its existence from another';
r = analyze(fd, spans(fd, [
  ['Whatever exists either gets its existence from itself', 'P'],
  ['or it gets its existence from another', 'P', true],
  ['Nothing gets its existence from itself', 'P', true],
  ['whatever exists gets its existence from another', 'P', true]
]));
assert.strictEqual(r.lines[0].symbolic, 'P ∨ ¬P');
assert.strictEqual(r.lines[0].tautology, true);
assert.strictEqual(r.result.valid, true);
assert(r.warnings.some((w) => w.kind === 'dichotomy'));
assert.strictEqual(r.strict.lines[0].symbolic, 'P ∨ Q');
assert.strictEqual(r.strict.lines[2].symbolic, 'Q');

// Real negations pass.
assert(isNegationOf('it is wet', 'it is not wet'));
assert(isNegationOf('it rains', "it doesn't rain"));
assert(isNegationOf('whatever exists gets its existence from itself', 'it does not get its existence from itself'));
assert(!isNegationOf('it gets its existence from itself', 'it gets its existence from another'));

// Connectives: only if, or, and, not.
const misc = 'P1. You pass only if you study\nP2. Either it is red or it is blue\nP3. It is cold and it is not dark';
r = analyze(misc, spans(misc, [['You pass', 'A'], ['you study', 'B'], ['it is red', 'R'], ['it is blue', 'S'],
  ['It is cold', 'C'], ['dark', 'D']]));
assert.deepStrictEqual(r.lines.map((l) => l.symbolic), ['A ⇒ B', 'R ∨ S', 'C ∧ ¬D']);
assert.strictEqual(r.implicitConclusion, true);

console.log('formalize ok');
