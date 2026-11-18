// Loads the parts of index.html that do not need a browser: the program (cards, numbered tables) and the save-code
// functions. Used by check.js, decode.js and fixtures.js so there is one implementation of the code format, the page's own.
//
//   load()                      the page as it is
//   load({ without: ['pull'] }) the page as it would be with those cards deleted from ROUTINES (true = every card)
const fs = require('fs'), path = require('path'), vm = require('vm');

function load(opts = {}) {
  const html = opts.html || fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (from, to) => { const a = script.indexOf(from), b = script.indexOf(to, a); if (a < 0 || b < 0) throw new Error('index.html: cannot find "' + (a < 0 ? from : to).trim() + '"'); return script.slice(a, b); };
  // program: from VERSION to the banner before "State"; codes: from the "Save codes" banner to the merging section.
  // The code functions are given nothing else, so they cannot come to depend on the cards or on the browser.
  const program = cut('const VERSION', '   State\n'), codes = cut('   Save codes\n', '/* ---------- merging');
  const drop = opts.without ? '\n{ const gone = ' + JSON.stringify(opts.without) + '; for (let i = ROUTINES.length - 1; i >= 0; i--) if (gone === true || gone.includes(ROUTINES[i].id)) ROUTINES.splice(i, 1); }' : '';
  const src = program.slice(0, program.lastIndexOf('/*')) + drop + '\n/*\n' + codes +
    '\n;({ VERSION, LANES, ROUTINES, LOG, CARDS, CARD_IDS, LIFTS, FORMAT, rawLines, assemble, decodeSave, buildCode, canon })';
  return Object.assign({ script }, vm.runInNewContext(src, { TextEncoder, TextDecoder, console }, { filename: 'index.html<script>' }));
}
module.exports = { load };
