# Fixed save codes

Each fixture is a save code (`<name>.code.txt`, exactly as a page showed it) and the workouts it must read back as
(`<name>.json`, one workout per line, in the page's own shape cut down to what a code carries). `node tools/check.js`
reads every code with the current `index.html` and compares, then has the page write the same workouts again and
read its own code back.

**Never edit, regenerate or delete a file here.** These stand for codes that are on phones and on paper. If the
check fails, the page is what changed; put the page back. New fixtures are only ever added
(`node tools/fixtures.js <name>`, on main, when lines are appended to `CARDS` or `LIFTS`).

| Fixture | What it is |
|---|---|
| `six-cards` | Four weeks on the six cards of main (Home, Work and EoS, Pull and Push), three visits each. Uses every line of `LIFTS` 1–17. Written by v2026.11.17-21. |
| `retired-cards` | Workouts on card numbers 3, 4, 7 and 8 (`legs`, `easy`, `work_legs`, `work_easy`), which have no card on the page, with lifts that are in no table. Shows that a workout keeps its card's name when the card is gone. Code written by v2026.11.17-21; names as read since save code 1.0. |
| `fork-plan` | What a friend's copy writes: cards and lifts that are in no table, spelled out in the code, next to listed ones; free text in weight and reps boxes, an emoji in a note, a workout that was never finished. Written by v2026.11.17-21. |

None of it is anyone's real training.
