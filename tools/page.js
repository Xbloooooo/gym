// Loads the parts of index.html that do not need a browser: the program (cards, numbered tables) and the save-code
// functions. Used by check.js, decode.js and fixtures.js so there is one implementation of the code format, the page's own.
//
//   load()                      the page as it is
//   load({ order: 'reverse' })  ... as it would be with the cards written in ROUTINES the other way round
//   load({ order: 'shuffle' })  ... in another order again (always the same one: every third card moved to the back)
//   load({ lanes: 'reverse' })  ... with the lines of LANES the other way round
//   load({ hide: ['pull'] })    ... with `hidden: true` on those cards (true = on every card)
//   load({ without: ['pull'] }) ... with those cards deleted from ROUTINES (true = every card)
const fs = require('fs'), path = require('path'), vm = require('vm');

function load(opts = {}) {
  const html = opts.html || fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (from, to) => { const a = script.indexOf(from), b = script.indexOf(to, a); if (a < 0 || b < 0) throw new Error('index.html: cannot find "' + (a < 0 ? from : to).trim() + '"'); return script.slice(a, b); };
  // program: from VERSION to the banner before "State"; codes: from the "Save codes" banner to the merging section.
  // The code functions are given nothing else, so they cannot come to depend on the browser.
  const program = cut('const VERSION', '   State\n'), codes = cut('   Save codes\n', '/* ---------- merging');
  const change = '\n{ const o = ' + JSON.stringify({ order: opts.order || '', lanes: opts.lanes || '', hide: opts.hide || false, without: opts.without || false }) + `;
    if (o.order === 'reverse') ROUTINES.reverse();
    if (o.lanes === 'reverse') LANES.reverse();
    if (o.order === 'shuffle') ROUTINES.splice(0, ROUTINES.length, ...ROUTINES.filter((r, i) => i % 3), ...ROUTINES.filter((r, i) => i % 3 === 0));   // every third card to the back
    for (const r of ROUTINES) if (o.hide === true || (o.hide && o.hide.includes(r.id))) r.hidden = true;
    for (let i = ROUTINES.length - 1; i >= 0; i--) if (o.without === true || (o.without && o.without.includes(ROUTINES[i].id))) ROUTINES.splice(i, 1); }`;
  // The change goes in right where ROUTINES ends, before the tables and everything else below it are made, so that
  // whatever is built from ROUTINES when the page loads is built from the changed one, as after a real edit.
  const from = program.indexOf('const ROUTINES = ['), end = program.indexOf('\n];\n', from);
  if (from < 0 || end < 0) throw new Error('index.html: cannot find where ROUTINES ends');
  const edited = program.slice(0, end + 4) + change + program.slice(end + 4);
  const src = edited.slice(0, edited.lastIndexOf('/*')) + '\n/*\n' + codes +
    '\n;({ VERSION, LANES, ROUTINES, LOG, CARDS, CARD_IDS, LIFTS, FORMAT, startScreen, rawLines, assemble, decodeSave, buildCode, canon })';
  return Object.assign({ script }, vm.runInNewContext(src, { TextEncoder, TextDecoder, console }, { filename: 'index.html<script>' }));
}
module.exports = { load };
