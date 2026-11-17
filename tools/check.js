// Checks index.html before a push. Run: node tools/check.js
//   1. the inline script parses
//   2. every card id is in CARD_IDS and every lift on a card is in LIFTS with the same log type
//      (a miss still works, but the save code has to spell the name out)
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
new vm.Script(m[1], { filename: 'index.html<script>' });
const ver = (m[1].match(/const VERSION = "([^"]+)"/) || [])[1];
console.log('script ok,', m[1].length, 'chars, VERSION', ver);

// The program block (everything before "State") is plain data and can be run on its own.
const program = m[1].slice(m[1].indexOf('const VERSION'), m[1].indexOf('   State\n'));
const body = program.slice(0, program.lastIndexOf('/*'));
const { ROUTINES, CARD_IDS, LIFTS } = vm.runInNewContext(body + '\n;({ ROUTINES, CARD_IDS, LIFTS })');
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
process.exitCode = warn ? 1 : 0;
