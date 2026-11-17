// Loads the parts of index.html that do not need a browser: the program (cards, numbered lists) and the save-code
// functions. Used by check.js and decode.js so there is one implementation of the code format, the page's own.
const fs = require('fs'), path = require('path'), vm = require('vm');

function load() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (from, to) => { const a = script.indexOf(from), b = script.indexOf(to, a); if (a < 0 || b < 0) throw new Error('index.html: cannot find "' + (a < 0 ? from : to).trim() + '"'); return script.slice(a, b); };
  // program: from VERSION to the banner before "State"; codes: from the "Save codes" banner to the merging section
  const program = cut('const VERSION', '   State\n'), codes = cut('   Save codes\n', '/* ---------- merging');
  const src = program.slice(0, program.lastIndexOf('/*')) + '\nconst routine = id => ROUTINES.find(r => r.id === id);\n/*\n' + codes +
    '\n;({ VERSION, ROUTINES, CARD_IDS, LIFTS, rawLines, assemble, decodeSave, buildCode, canon })';
  return Object.assign({ script }, vm.runInNewContext(src, { TextEncoder, TextDecoder, console }, { filename: 'index.html<script>' }));
}
module.exports = { load };
