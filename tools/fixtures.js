#!/usr/bin/env node
// The fixed save codes in tests/fixtures/. Each one is two files:
//   <name>.code.txt   a save code, exactly as a page showed it
//   <name>.json       the workouts that code must read back as, one per line: the page's own workout objects, cut
//                     down to what a code carries (carried() below), so a new display field does not disturb them
// check.js reads every code with the current index.html and compares. A fixture is never edited, regenerated or
// deleted: it stands for codes that are on phones and on paper, and those cannot be regenerated.
//
//   node tools/fixtures.js <name>   main only, after appending lines to CARDS or LIFTS: writes one more fixture that
//                                   uses every line no fixture uses yet. Does nothing if all lines are used.
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'tests', 'fixtures');
const toFile = workouts => '[\n' + workouts.map(w => JSON.stringify(w)).join(',\n') + '\n]\n';
// What a code carries of a workout, in a fixed shape: card, name, start and finish minute, note, and per lift its
// name, log type, optional, skipped and the checked sets.
const carried = workouts => workouts.map(w => Object.assign({ routineId: w.routineId, name: w.name, startedAt: w.startedAt }, w.finishedAt ? { finishedAt: w.finishedAt } : {}, { note: w.note,
  exercises: w.exercises.map(e => Object.assign({ name: e.name, log: e.log, optional: !!e.optional }, e.skipped ? { skipped: true } : {}, { sets: e.sets.map(x => ({ w: x.w, r: x.r, done: true })) })) }));

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => f.endsWith('.code.txt')).sort().map(f => {
    const name = f.slice(0, -'.code.txt'.length);
    return { name, code: fs.readFileSync(path.join(DIR, f), 'utf8'), want: JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8')) };
  });
}
// One code -> its workouts, the way the page reads it. Throws with the page's own message if it cannot.
async function read(page, text) {
  const codes = page.assemble([page.rawLines(text)]);
  if (codes.length !== 1) throw new Error(codes.length + ' codes found in it instead of 1');
  if (codes[0].missing.length) throw new Error('line ' + codes[0].missing.map(i => i + 1).join(', ') + ' is missing');
  return carried(await page.decodeSave(codes[0]));
}
// Lines of the two tables that no fixture would miss. Found the direct way: change one line, read every fixture, and
// see whether any of them comes back different; then put the line back. (A name that a fixture spells out in full
// does not count: only a code that wrote the line's number notices when the line changes.)
async function unused(page, fixtures) {
  const allRead = async () => { for (const f of fixtures) { try { if (JSON.stringify(await read(page, f.code)) !== JSON.stringify(f.want)) return false; } catch (e) { return false; } } return true; };
  const out = { cards: [], lifts: [] };
  if (!await allRead()) return out;              // already failing: check.js has said why
  for (let i = 0; i < page.CARDS.length; i++) {
    const keep = page.CARDS[i][0]; page.CARDS[i][0] = page.CARD_IDS[i] = keep + ' (moved)';
    const blind = await allRead(); page.CARDS[i][0] = page.CARD_IDS[i] = keep;
    if (blind) out.cards.push({ n: i + 1, id: keep, name: page.CARDS[i][1] });
  }
  for (let i = 0; i < page.LIFTS.length; i++) {
    const keep = page.LIFTS[i][0]; page.LIFTS[i][0] = keep + ' (moved)';
    const blind = await allRead(); page.LIFTS[i][0] = keep;
    if (blind) out.lifts.push({ n: i + 1, name: keep, log: page.LIFTS[i][1] });
  }
  return out;
}
module.exports = { DIR, list, read, unused, carried };

if (require.main === module) (async () => {
  const page = require('./page.js').load(), name = process.argv[2];
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) { console.error('usage: node tools/fixtures.js <name>     (small letters, digits and dashes, e.g. legs-cards-2027)'); process.exit(2); }
  if (fs.existsSync(path.join(DIR, name + '.code.txt')) || fs.existsSync(path.join(DIR, name + '.json'))) { console.error('tests/fixtures/' + name + ' exists. A fixture is never overwritten: pick another name.'); process.exit(2); }
  const u = await unused(page, list());
  if (!u.cards.length && !u.lifts.length) { console.log('Every line of CARDS and LIFTS is already in a fixture. Nothing written.'); return; }
  // One made-up workout per unused card, on that card's own lifts; unused lifts that are on none of them ride along.
  const sets = log => (log === 'bodyweight' ? [['', '12'], ['', '10']] : [['20', '10'], ['22.5', '8']]).map(x => ({ w: x[0], r: x[1], done: true }));
  const left = new Map(u.lifts.map(l => [l.name, l.log])), t0 = Date.UTC(2027, 0, 4, 18, 0);
  const cards = u.cards.length ? u.cards : [{ id: page.CARDS[0][0], name: page.CARDS[0][1] }];
  const log = cards.map((c, i) => {
    const r = page.ROUTINES.find(r => r.id === c.id), lifts = r ? r.exercises.map(e => [e.name, e.log || '']) : [];
    if (i === cards.length - 1) for (const [n, g] of left) if (!lifts.some(l => l[0] === n)) lifts.push([n, g]);
    if (!lifts.length) lifts.push(page.LIFTS[0]);
    lifts.forEach(l => left.delete(l[0]));
    const t = t0 + i * 2 * 86400000;
    return { routineId: c.id, name: c.name, startedAt: new Date(t).toISOString(), finishedAt: new Date(t + 45 * 60000).toISOString(), note: '', exercises: lifts.map(l => ({ name: l[0], log: l[1], sets: sets(l[1]) })) };
  });
  const sv = page.buildCode(log), back = await read(page, sv.text);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, name + '.code.txt'), sv.text + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(DIR, name + '.json'), toFile(back), { flag: 'wx' });
  console.log('tests/fixtures/' + name + ': ' + back.length + ' workouts, ' + sv.lines.length + ' lines. Uses ' + [...u.cards.map(c => 'card ' + c.n + ' "' + c.id + '"'), ...u.lifts.map(l => 'lift ' + l.n + ' "' + l.name + '"')].join(', ') + '.\nCommit both files with the table lines. From now on they are never changed.');
})();
