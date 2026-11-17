// Checks index.html before a push. Run: node tools/check.js
//   1. the inline script parses
//   2. every card id is in CARD_IDS and every lift on a card is in LIFTS with the same log type
//      (a miss still works, but the save code has to spell the name out)
//   3. a save code written from the cards reads back the same, here in node as well as in the browser
const vm = require('vm');
const page = require('./page.js').load();
new vm.Script(page.script, { filename: 'index.html<script>' });
console.log('script ok,', page.script.length, 'chars, VERSION', page.VERSION);

const { ROUTINES, CARD_IDS, LIFTS } = page;
let warn = 0;
const names = LIFTS.map(l => l[0]);
if (new Set(names).size !== names.length) { console.log('WARN: LIFTS has a repeated name'); warn++; }
if (new Set(CARD_IDS).size !== CARD_IDS.length) { console.log('WARN: CARD_IDS has a repeated id'); warn++; }
for (const r of ROUTINES) {
  if (!CARD_IDS.includes(r.id)) { console.log(`WARN: card "${r.id}" is not in CARD_IDS — append it`); warn++; }
  for (const e of r.exercises) {
    const l = LIFTS.find(x => x[0] === e.name);
    if (!l) { console.log(`WARN: "${e.name}" (${r.id}) is not in LIFTS — append ["${e.name}", "${e.log || ''}"]`); warn++; }
    else if (l[1] !== (e.log || '')) { console.log(`WARN: "${e.name}" is log "${e.log}" on ${r.id} but "${l[1]}" in LIFTS`); warn++; }
  }
}
console.log(`${ROUTINES.length} cards, ${LIFTS.length} lifts listed, ${warn} warning${warn === 1 ? '' : 's'}`);

// One workout per card, every set checked at the card's defaults, two rounds a few days apart.
(async () => {
  const log = [];
  for (let round = 0; round < 2; round++) ROUTINES.forEach((r, i) => {
    const t = Date.UTC(2026, 10, 18 + round * 3, 17, 5 + i) + i * 86400000;
    log.push({ routineId: r.id, name: r.name, startedAt: new Date(t).toISOString(), finishedAt: new Date(t + 41 * 60000).toISOString(), note: round ? 'second round' : '',
      exercises: r.exercises.map(e => ({ name: e.name, log: e.log || '', optional: !!e.optional, skipped: !!e.optional && round === 1,
        sets: Array.from({ length: e.sets || 1 }, (_, j) => ({ w: e.defaultWeight == null ? '' : String(e.defaultWeight + round * 5), r: String(parseInt(e.defaultReps || '8', 10) - j * round), done: true })) })) });
  });
  const sv = page.buildCode(log), codes = page.assemble([page.rawLines('some text 123\n' + sv.text.toLowerCase())]);
  const back = codes.length === 1 && !codes[0].missing.length ? await page.decodeSave(codes[0]) : null;
  const same = back && JSON.stringify(page.canon(back)) === JSON.stringify(page.canon(log));
  console.log(`save code: ${log.length} workouts -> ${sv.chars} letters, ${sv.lines.length} lines, reads back ${same ? 'the same' : 'DIFFERENT'}`);
  process.exitCode = warn || !same ? 1 : 0;
})();
