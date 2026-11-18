// Checks index.html before a push. Run: node tools/check.js     (exit code 0 = fine, 1 = something to fix)
//   1. the inline script parses
//   2. the cards agree with the numbered tables the save code uses (CARDS, LIFTS)
//   3. a save code written from the cards reads back the same, here in node as well as in the browser
const vm = require('vm');
const page = require('./page.js').load();
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

// 3. One workout per card, every set checked at the card's defaults, two rounds a few days apart.
(async () => {
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
  console.log(fail ? `\n${fail} thing${fail === 1 ? '' : 's'} to fix` : '\nall good');
  process.exitCode = fail ? 1 : 0;
})();
