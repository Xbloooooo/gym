// Checks index.html before a push. Run: node tools/check.js     (exit code 0 = fine, 1 = something to fix)
//   1. the inline script parses
//   2. the cards agree with the numbered tables the save code uses (CARDS, LIFTS)
//   3. a save code written from the cards reads back the same, here in node as well as in the browser
//   4. the fixed codes in tests/fixtures/ read back exactly as recorded, and survive being written again
//   5. they still do with a plan removed, and with every plan removed
//   6. every line of CARDS and LIFTS is used by a fixture: each line is changed in turn, and a fixture must notice
// AGENTS.md says what each failure means.
const vm = require('vm');
const { load } = require('./page.js'), fixtures = require('./fixtures.js');
const page = load();
let fail = 0;
const FAIL = msg => { console.log('FAIL: ' + msg); fail++; };

// 1
new vm.Script(page.script, { filename: 'index.html<script>' });
console.log('script ok,', page.script.length, 'chars, VERSION', page.VERSION);

// 2. A listed card or lift must match its line; an unlisted one is fine (its name is spelled out in the code).
const { ROUTINES, CARDS, LIFTS, LOG } = page;
const repeated = list => list.filter((v, i) => list.indexOf(v) !== i);
for (const id of repeated(CARDS.map(c => c[0]))) FAIL(`CARDS lists "${id}" twice. A line is never reused: take the new one out.`);
for (const n of repeated(LIFTS.map(l => l[0]))) FAIL(`LIFTS lists "${n}" twice. A line is never reused: take the new one out.`);
for (const id of repeated(ROUTINES.map(r => r.id))) FAIL(`two cards in ROUTINES have the id "${id}".`);
const unlisted = [];
for (const r of ROUTINES) {
  const c = CARDS.find(c => c[0] === r.id);
  if (!c) unlisted.push(`card "${r.id}" (${r.name})`);
  else if (c[1] !== r.name) FAIL(`card "${r.id}" is named "${r.name}" but its line in CARDS says "${c[1]}". An id and its name are one pair, because old codes carry only the number. Give this card its own id (and leave the CARDS line as it is).`);
  for (const e of r.exercises) {
    const l = LIFTS.find(x => x[0] === e.name);
    if (e.log && !LOG[e.log]) FAIL(`"${e.name}" on ${r.id} has log "${e.log}", which is not one of: ${Object.keys(LOG).join(', ')}.`);
    if (!l) { if (!unlisted.includes(`lift "${e.name}"`)) unlisted.push(`lift "${e.name}"`); }
    else if (l[1] !== (e.log || '')) FAIL(`"${e.name}" is log "${e.log || ''}" on ${r.id} but "${l[1]}" in LIFTS. A code would bring it back as "${l[1]}". Use the listed log type, or give this lift its own name.`);
  }
}
console.log(`${ROUTINES.length} cards; tables: ${CARDS.length} cards, ${LIFTS.length} lifts` + (unlisted.length ? `; ${unlisted.length} not listed` : '; everything on the cards is listed'));
if (unlisted.length) console.log('  not listed (works, the code spells the name out; main lists a plan when it merges it):\n    ' + unlisted.join('\n    '));

(async () => {
  // 3. One workout per card, every set checked at the card's defaults, two rounds a few days apart.
  const log = [];
  for (let round = 0; round < 2; round++) ROUTINES.forEach((r, i) => {
    const t = Date.UTC(2026, 10, 18 + round * 3, 17, 5 + i) + i * 86400000;
    log.push({ routineId: r.id, name: r.name, startedAt: new Date(t).toISOString(), finishedAt: new Date(t + 41 * 60000).toISOString(), note: round ? 'second round' : '',
      exercises: r.exercises.map(e => ({ name: e.name, log: e.log || '', optional: !!e.optional, skipped: !!e.optional && round === 1,
        sets: Array.from({ length: e.sets || 1 }, (_, j) => ({ w: e.defaultWeight == null ? '' : String(e.defaultWeight + round * 5), r: String(parseInt(e.defaultReps || '8', 10) - j * round), done: true })) })) });
  });
  if (log.length) {
    const sv = page.buildCode(log), codes = page.assemble([page.rawLines('some text 123\n' + sv.text.toLowerCase())]);
    const back = codes.length === 1 && !codes[0].missing.length ? await page.decodeSave(codes[0]) : null;
    const same = back && JSON.stringify(page.canon(back)) === JSON.stringify(page.canon(log));
    console.log(`save code from the cards: ${log.length} workouts -> ${sv.chars} letters, ${sv.lines.length} lines, reads back ${same ? 'the same' : 'DIFFERENT'}`);
    if (!same) FAIL('a code written from the cards does not read back the same.');
  } else console.log('save code from the cards: no cards, nothing to write');

  // 4. Codes that exist. What they say is not ours to change any more.
  const fx = fixtures.list(), WHY = '\n      A code that is already on a phone or on paper now reads differently, and nothing warns its owner. Undo the change to\n      CARDS, LIFTS or the save-code functions. Do not edit, regenerate or delete the fixture.';
  const head = w => `"${w.name}" [${w.routineId}] ${w.startedAt.slice(0, 16)}, ${w.finishedAt ? Math.round((Date.parse(w.finishedAt) - Date.parse(w.startedAt)) / 60000) + ' min' : 'not finished'}, ${w.exercises.length} lifts` + (w.note ? `, note "${w.note}"` : '');
  const lift = e => e ? `${e.name} (${e.log || 'no log type'}${e.optional ? ', optional' : ''}) ` + (e.skipped ? 'skipped' : e.sets.map(x => x.w + '×' + x.r).join(' ') || 'no sets') : 'nothing';
  const versus = (a, b) => {                     // the first thing that differs between two workouts, in words
    if (head(a) !== head(b)) return [head(a), head(b)];
    const i = a.exercises.findIndex((e, i) => JSON.stringify(e) !== JSON.stringify(b.exercises[i]));
    return [`${head(a)} · lift ${i + 1}: ${lift(a.exercises[i])}`, `${head(b)} · lift ${i + 1}: ${lift(b.exercises[i])}`];
  };
  const differs = async (pg, f) => {             // '' when the code reads back exactly as recorded, else what went wrong
    let got; try { got = await fixtures.read(pg, f.code); } catch (e) { return 'it is not read at all: ' + e.message; }
    if (JSON.stringify(got) === JSON.stringify(f.want)) return '';
    if (got.length !== f.want.length) return `it reads back as ${got.length} workouts, not ${f.want.length}`;
    const k = got.findIndex((w, i) => JSON.stringify(w) !== JSON.stringify(f.want[i])), [was, now] = versus(f.want[k], got[k]);
    return `workout ${k + 1} of ${got.length}\n      was:  ${was}\n      now:  ${now}`;
  };
  let total = 0;
  for (const f of fx) {
    total += f.want.length;
    const d = await differs(page, f);
    if (d) { FAIL(`fixture ${f.name}: ${d}${WHY}`); continue; }
    // and the other way: the page writes these workouts and reads its own code back to the same thing. (The letters
    // may differ from the fixture's: a lift that was spelled out then may have a line in LIFTS now.)
    const again = await differs(page, { code: page.buildCode(f.want).text, want: f.want }).catch(e => e.message);
    if (again) FAIL(`fixture ${f.name}: read back right, but written again by this page and read once more it differs: ${again}`);
  }
  if (!fx.length) FAIL('tests/fixtures/ has no codes. They are the only thing that notices a moved table line: restore them from git.');
  else if (!fail) console.log(`fixtures: ${fx.length} codes (${fx.map(f => f.name).join(', ')}), ${total} workouts read back exactly as recorded`);

  // 5. Taking a plan off the page must not touch what old codes say, least of all the name of its workouts.
  if (fx.length) {
    const live = ROUTINES.map(r => r.id).find(id => fx.some(f => f.want.some(w => w.routineId === id)));
    const tries = (live ? [[[live], `plan removed (${live})`]] : []).concat([[true, 'every plan removed']]), said = [];
    for (const [without, label] of tries) {
      const pg = load({ without }); let bad = '';
      for (const f of fx) { const d = await differs(pg, f); if (d && !bad) bad = `fixture ${f.name}: ${d}`; }
      if (bad) FAIL(`${label}: ${bad}\n      Old workouts must read the same whether or not their card is still in ROUTINES. The save-code functions may only use CARDS and LIFTS.`);
      else said.push(live && without !== true ? `${label}: its ${fx.reduce((n, f) => n + f.want.filter(w => w.routineId === live).length, 0)} old workouts still read "${fx.flatMap(f => f.want).find(w => w.routineId === live).name}"` : `${label}: all ${total} read the same`);
    }
    if (said.length) console.log(said.join('; '));
  }

  // 6
  const u = await fixtures.unused(page, fx);
  for (const c of u.cards) FAIL(`line ${c.n} of CARDS ("${c.id}") is in no fixture, so nothing would notice if it moved.`);
  for (const l of u.lifts) FAIL(`line ${l.n} of LIFTS ("${l.name}") is in no fixture, so nothing would notice if it moved.`);
  if (u.cards.length || u.lifts.length) console.log('      On main, after appending lines: node tools/fixtures.js <name> writes a fixture that uses them; commit it with the lines.\n      On a fork: take the new lines out again. A plan works without them, and main lists it when it merges it.');
  else if (fx.length && !fail) console.log(`tables: every line of CARDS (${CARDS.length}) and LIFTS (${LIFTS.length}) is used by a fixture (changed each in turn; a fixture noticed every time)`);

  console.log(fail ? `\n${fail} thing${fail === 1 ? '' : 's'} to fix` : '\nall good');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('FAIL: the check stopped half way, which is a failure too.\n' + (e && e.stack || e)); process.exitCode = 1; });
