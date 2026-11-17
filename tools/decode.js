#!/usr/bin/env node
// Reads gym save codes and prints the workouts in them. The page only hands out codes, so this is how a code is read
// off the phone.
//
//   node tools/decode.js < code.txt          paste one or more codes (any order, other text around them is ignored)
//   node tools/decode.js code1.txt code2.txt
//   node tools/decode.js --json < code.txt   the workouts as JSON, in the page's own shape
//   node tools/decode.js --last 1 < code.txt only the newest workout(s)
//
// Codes are merged the way the page merges them: one workout per card and start minute.
const fs = require('fs');
const page = require('./page.js').load();

const args = process.argv.slice(2), json = args.includes('--json');
const li = args.indexOf('--last'), last = li >= 0 ? Math.max(1, parseInt(args[li + 1], 10) || 1) : 0;
const files = args.filter((a, i) => !a.startsWith('--') && !(li >= 0 && i === li + 1));
const text = files.length ? files.map(f => fs.readFileSync(f, 'utf8')).join('\n') : fs.readFileSync(0, 'utf8');

(async () => {
  const codes = page.assemble([page.rawLines(text)]);
  if (!codes.length) { console.error('No save code found. A code is recognised by its first line, and only codes from the current format are read.'); process.exit(2); }
  const seen = new Set(), workouts = []; let bad = 0;
  for (const c of codes) {
    if (c.missing.length) { bad++; console.error('Incomplete code: ' + (c.total - c.missing.length) + ' of ' + c.total + ' lines, missing line ' + c.missing.map(i => i + 1).join(', ')); continue; }
    try { for (const w of await page.decodeSave(c)) { const k = w.routineId + '|' + Math.floor(Date.parse(w.startedAt) / 60000); if (!seen.has(k)) { seen.add(k); workouts.push(w); } } }
    catch (e) { bad++; console.error('Unreadable code: ' + e.message); }
  }
  workouts.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const out = last ? workouts.slice(-last) : workouts;
  if (json) { console.log(JSON.stringify(out, null, 1)); process.exit(bad ? 1 : 0); }
  const p2 = n => String(n).padStart(2, '0');
  const when = iso => { const d = new Date(iso); return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const width = Math.max(0, ...out.flatMap(w => w.exercises.map(e => e.name.length)));
  for (const w of out) {
    const mins = w.finishedAt ? Math.round((Date.parse(w.finishedAt) - Date.parse(w.startedAt)) / 60000) + ' min' : 'not finished';
    console.log(w.name + ' [' + w.routineId + '] · ' + when(w.startedAt) + ' · ' + mins);
    if (w.note) console.log('  note: ' + w.note);
    for (const e of w.exercises) {
      const none = e.log === 'bodyweight' ? 'bw' : '—', ws = e.sets.map(x => x.w || none), rs = e.sets.map(x => x.r || '—');
      const sets = e.skipped ? 'skipped' : !e.sets.length ? 'no sets checked' :
        ws.every(v => v === ws[0]) ? ws[0] + ' × ' + rs.join(', ') : ws.map((v, i) => v + '×' + rs[i]).join(', ');
      console.log('  ' + e.name.padEnd(width + 2) + sets + (e.log ? '   (' + e.log + ')' : ''));
    }
    console.log('');
  }
  console.log(out.length + ' workout' + (out.length === 1 ? '' : 's') + (last && workouts.length > out.length ? ' shown of ' + workouts.length : '') + ' from ' + codes.length + ' code' + (codes.length === 1 ? '' : 's') + (bad ? ', ' + bad + ' not readable' : ''));
  process.exit(bad ? 1 : 0);
})();
