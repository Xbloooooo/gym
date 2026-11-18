# Working on Gym as an agent

For AI agents (and people) changing this repo, on main or on a fork. `README.md` is for people using the page; this
file is for whoever edits it. Read it once before the first edit.

## What this is

A workout logger for the phone. One page, no account, no server: GitHub Pages serves static files, and the log lives
in that phone's browser storage. To move or back up a log, the page hands out a **save code**, a block of letters
that can be pasted, screenshotted and read back by OCR, and merged with other codes.

- Upstream: https://github.com/Xbloooooo/gym, served at https://xbloooooo.github.io/gym/. Branch `main` is the site.
- Friends fork it, run their own copy with their own plans, and send improvements back as pull requests.
- The workout plans on main (Home / Work / EoS, Pull and Push) are the owner's own, kept as worked examples.

## Layout

    index.html             the whole app: styles, then one inline script
    manifest.webmanifest   name and icons for Add to Home Screen
    fonts/  ocr/           vendored fonts and Tesseract (OCR); loaded from the repo, never from a CDN
    tools/check.js         the check. Run it before every push
    tools/page.js          loads the cards and the save-code functions out of index.html into node, as they are or
                           with the plans reordered, hidden or removed
    tools/decode.js        save code(s) -> readable workouts, for reading a code off a phone
    tools/fixtures.js      reads tests/fixtures/; on main, writes a new fixture
    tests/fixtures/        fixed save codes and what they must read back as. Never edited
    .github/workflows/     runs the check on every push and pull request

There is no build step and no package.json. The tools need only node. Keep it that way: no dependencies, no bundler,
no framework, nothing fetched from another host at run time.

Inside the script of `index.html`, in order (search for the banner text):

| Banner | What is there |
|---|---|
| `PROGRAM` | `VERSION`, `TARGETS`, `LANES`, `ROUTINES` (the plans), `LOG`, then the save-code tables `CARDS` and `LIFTS` |
| `State` | `localStorage["gym_tracker_v1"]` = `{ workouts, draft, theme, backup }`; `normState` repairs and migrates it |
| `Sessions` | what the page fills in when a session starts, the weight marks, start / finish |
| `Rest timer, beep, wake lock` | |
| `Views` | home, session, history, one workout, share card, progress, backup |
| `Events` | one click handler, dispatching on `data-act` |
| `Save codes` | the format. **Frozen**, see below |
| `merging`, `save image`, `OCR`, `JSON file` | getting codes in and out |

`tools/page.js` cuts the script at two of those banners (`PROGRAM` to `State`, and `Save codes` to `merging`), so
do not rename them, and keep the save-code functions free of anything from the browser or from `ROUTINES`.

## Two orders: what the start screen shows, and what the save code counts

`index.html` lists the plans twice, and the two lists do different jobs. Keep them apart.

**1. The display side: `LANES` and `ROUTINES`.** This is what a person sees. Change it freely, on any fork, at any
time. Nothing here is stored on the phone or written into a save code.

- Gyms appear in the order of the lines in `LANES`.
- Inside a gym, plans appear in the order their objects are written in `ROUTINES`. To move a plan, move its object.
- `hidden: true` on a plan takes it off the start screen, and does nothing else. Its past workouts stay in History,
  in Progress and its filters, and in every save code, under the plan's name. Take the flag off and it is back.
- Any plan can be hidden, and all of them. With none shown, the start screen says so, and History, Progress, the
  share card and adding codes all keep working.
- Deleting a plan's object takes it off the start screen for good. Its past workouts are kept the same way.

**2. The code side: `CARDS` and `LIFTS`.** These are the line numbers a save code writes instead of names. Their
order is that numbering and nothing else. It is never shown, nothing is sorted by it, and it never changes: lines
are only added at the end, and only on main (next section).

An example with main's plans. `ROUTINES` is written Home Pull, Home Push, Work Pull, Work Push, EoS Pull, EoS Push.
`CARDS` numbers them 1, 2, 5, 6, 9 and 10. Say the office gym closes and EoS becomes the usual place:

    LANES      move the EoS line to the top                    EoS is the first gym on the start screen
    ROUTINES   move the EoS Push object above EoS Pull          Push comes first there
    ROUTINES   hidden: true on Work Pull and on Work Push       the office gym is gone from the start screen
    CARDS      nothing                                          Work Pull is still 5, EoS Push is still 10

Every old Work Pull workout still shows in History as "Work Pull", the Office gym filter is still in Progress, and
every code ever written reads back the same.

Never build one side from the other: no `CARDS` made out of `ROUTINES`, no start screen sorted by `CARDS`, no
skipping a hidden plan when a code is read. `check.js` tries each of these changes on every run (below).

## Save code 1.0: what must never change

A save code written by any copy of this page, at any time since 1.0, has to read back as the same workouts on every
other copy, for good. People keep codes in notes, in screenshots and on paper; nothing can go back and fix those.
The dangerous failures are silent: a code that still decodes, with no error, but names a different card or lift.

**Frozen** (everything between the `Save codes` banner and `merging`, plus the two tables):

- the 16 letters, the line length, the check letters, the 7-byte head, `FORMAT = 4`, `EPOCH_MIN`;
- what a workout is reduced to (`canon`), including its limits and the quarter-unit weights;
- the walk that writes and reads it (`logCodec`) and the coder under it, down to the odds it starts from;
- every existing line of `CARDS` and `LIFTS`.

If a change seems to need any of that changed, stop. A new format is a decision for main: it gets a new `FORMAT`
number, and format 4 must stay readable beside it. Open an issue upstream instead of editing.

**The tables.** A code writes a card or a lift as its line number in `CARDS` / `LIFTS`, not as its name.

- **Append only, and only on main.** Never reorder, delete, reuse or edit a line. Not to tidy, not to fix a typo.
- **Hiding or removing a plan** is done in `ROUTINES` (`hidden: true`, or delete its object). Its `CARDS` line
  stays, and so do its lifts in `LIFTS`. Old workouts on it still read back with the name beside its id.
- **A card's id and name are one pair.** To rename a card, give it a new id (a new line, on main); the old line
  stays. `check.js` fails if a card in `ROUTINES` has a listed id under a different name.
- **A renamed lift is a new lift**: new line (on main), old line stays, old codes keep the old name. The page also
  treats it as new: prefill, "change since last time" and the progress chart go by lift name.
- **A lift keeps its log type** (`db`, `cable`, …). Same movement on a different kind of equipment is another name.
- **Not being listed is fine.** A card or lift that has no line works everywhere: the code spells its id and name
  out, which only costs letters, and any copy of the page reads it. **Forks leave the tables alone.** Two forks
  appending different lines would give the same number two meanings. Main lists a plan when it merges it.
- A code that uses a number this copy does not have (written by a newer copy) is refused with a message saying so.
  That is deliberate; do not make it guess.

Also not to be changed without care: the storage key and shape. If a stored field has to change, `normState` must
carry old data over (see how it handles the `unity_*` ids), and the JSON export must still import.

## tools/check.js

    node tools/check.js        # exit code 0 = fine, 1 = something to fix

Run it before every commit you push. GitHub runs the same thing on every push and pull request. What it prints:

| Line | What was checked |
|---|---|
| `script ok, … VERSION …` | The script in `index.html` parses. |
| `N cards; tables: …` | Every card and lift in `ROUTINES` either matches its line in `CARDS` / `LIFTS` (same name, same log type) or is not listed at all. "Not listed" is a note, not a failure. |
| `save code from the cards: …` | One made-up workout per card is written as a code and read back the same, in node. |
| `fixtures: …` | Every code in `tests/fixtures/` reads back as exactly the workouts recorded beside it, and survives being written again by this page. These are codes from the past: this is the line that notices a moved table line or a changed format. |
| `start screen changed 7 ways; …` | The page is loaded again with the plans reversed, shuffled, the gyms reversed, one plan hidden, all hidden, one deleted, all deleted. Each time every fixture must read back the same, names included; `CARDS` and `LIFTS` must not have moved; and the start screen must show exactly the plans that are not hidden, in `LANES` then `ROUTINES` order. |
| `tables: every line …` | Each line of `CARDS` and `LIFTS` is changed in turn; a fixture has to notice every time. A line no fixture uses could move without anyone knowing. |

When it fails:

- **`fixture …: workout N … was / now`**: the page changed what an existing code means. Undo the change to the
  tables or the save-code functions. **Never edit, regenerate or delete a fixture to make this pass**; a pull request
  that touches an existing fixture is rejected by the Action.
- **`card "x" is named … but its line in CARDS says …`**: give your card its own id.
- **`"lift" is log … but … in LIFTS`**: use the listed log type or another name.
- **`line N of … is in no fixture`**: lines were appended without a fixture. On a fork, take the lines out. On main,
  `node tools/fixtures.js <name>` writes one; commit it with the lines.

`node tools/decode.js < code.txt` prints the workouts in a code (`--json` for the page's own objects). Use it to
look at real data instead of guessing what a code holds.

## How to add a workout plan

A plan is one object in `ROUTINES` (a "card" on the home screen). There is no plan builder or importer in the page
yet: plans are stitched in by an agent, from whatever the person has: a Hevy routine link, a screenshot of another
app, a photo of a notebook, a paragraph of text. Read the source, write the object, show the person the result.

The three gyms on main are the worked examples. Home Pull, shortened:

    { id: "pull", name: "Home Pull", blurb: "Row 85 · assist 100 · face pull 25", exercises: [
      { name: "Seated cable row — V grip", sets: 3, repTarget: "10", rest: 120, target: "85", log: "cable",
        defaultWeight: 85, defaultReps: "10", note: "All sets top of range clean → bump next time." },
      { name: "Assisted pull-up", sets: 3, repTarget: "5", rest: 150, target: "assist 100", log: "assist",
        defaultWeight: 100, defaultReps: "5" },
      { name: "Seated incline dumbbell curl", sets: 2, repTarget: "6-12", rest: 75, target: "20–25 per hand", log: "db" },
      { name: "EZ bar biceps curl", sets: 3, repTarget: "10", rest: 45, log: "bar", defaultReps: "10", optional: true }
    ]},

All six cards on main came from two Hevy routines ("Comeback Pull", "Comeback Push"): exercise names, set counts,
rep targets and rest times were copied over; loads were filled in only where the person had real numbers, and left
out where they did not (`blurb: "Loads not set yet — first session sets the openers"`).

**The card**

| Field | Meaning |
|---|---|
| `id` | Lane prefix + pattern: `pull`, `work_pull`, `eos_pull`. Small letters, digits, `_`. Unique, and never an id that is in `CARDS` unless it is that very card. The part after the prefix is the pattern; starting the same pattern in two lanes on one day asks first. |
| `name` | Shown everywhere and stored with each workout. Unique. |
| `blurb` | One line under the name on the home screen. |
| `exercises` | The lifts, in the order they are done. |
| `hidden: true` | Off the start screen; everything else about the plan and its history stays. |

**Each lift**

| Field | Meaning |
|---|---|
| `name` | Use the exact name from `LIFTS` when it is the same movement with the same log type; history and the progress chart join on the name. Otherwise any new name. |
| `sets` | How many set rows open. More can be added during a session. |
| `log` | What the weight box means, which also picks how the weight is drawn and counted: `db` per hand (volume counts both hands), `bar`, `cable`, `machine`, `kb`, `assist` (the assist pin: lower is harder, left out of volume), `bodyweight` (weight may stay blank). See `LOG`. |
| `repTarget` | Text, `"10"` or `"6-12"`. The range drives the reps a set opens with and the "move up" offer. |
| `rest` | Seconds on the timer after a set. Leave out for no timer. |
| `defaultWeight`, `defaultReps` | What a set opens with the first time. After that the page copies the last session on that card. Leave the weight out if the person has no number yet. |
| `target` | Free text shown on the lift. If it starts with a number and there is no `defaultWeight`, the first session opens at that number. |
| `note`, `cue` | Free text shown on the lift. |
| `optional: true` | Marked optional; skipping it is expected. |
| `step` | Plate step for the +/− buttons when the built-in guess (5, or 2.5 for light dumbbells and cables) is wrong. |
| `form` | `{ exrx, wiki, yt }` links, any of them. |

**Lanes.** `LANES` are places, because loads do not carry between gyms: each has a `prefix` for card ids, a `label`
and a `venue`. A card belongs to the lane whose prefix its id starts with, and to the lane with no prefix
otherwise. For a new place, add a lane with a new prefix, then cards under it. The order of the lanes is the order
of the gyms on the start screen.

**Steps**

1. Add the object to `ROUTINES`, at the place it should appear among its gym's plans. Add a lane first if it is a
   new place.
2. `node tools/check.js`. New cards and lifts show as "not listed"; that is expected and fine.
3. Leave `CARDS` and `LIFTS` alone unless you are committing to main (below).
4. Open the page, start the card, check a set, finish, and look at the workout's page and its share card.

Editing a plan (loads, sets, rests, notes, order, adding or dropping lifts) needs nothing else. To take a plan off
the start screen, give it `hidden: true`, or delete its object if it is never coming back; either way its workouts
stay in History and in every code. On a fork, the example plans can simply be hidden.

## Forks, pull requests, and syncing

Each fork is its own site (`https://<user>.github.io/gym/`) with its own storage on each phone. Save codes are the
same format everywhere, so a code from one copy can be added on another.

**Setting up a fork.** Fork on GitHub; Settings → Pages → deploy from branch `main`, root; Actions tab → enable
workflows (GitHub switches them off on a new fork). Add `upstream`:
`git remote add upstream https://github.com/Xbloooooo/gym.git`.

**Two kinds of change. Keep them in separate commits.**

- *Yours*: your plans in `ROUTINES`, their order and which are hidden, your `LANES`, `TARGETS`. They live on your
  fork's `main` and are not sent upstream, unless the pull request is about adding a plan to main.
- *Everyone's*: fixes and features. These go upstream.

**Sending a change upstream.** Cut the branch from upstream, not from your fork's main, so your plans do not ride
along: `git fetch upstream && git switch -c short-name upstream/main`, make the change, `node tools/check.js`,
push, `gh pr create --repo Xbloooooo/gym`. Say what you tested and on what. The first pull request from a new
contributor waits for the owner to approve the Action run.

**Taking main's changes.** `git fetch upstream && git merge upstream/main`. If you replaced the example plans with
your own, expect a conflict in `ROUTINES` whenever main edits its examples: keep your side there, and take main's
side for `CARDS`, `LIFTS` and everything under `Save codes`. Run the check after every merge.

**The owner can also merge a fork directly**, without a pull request:
`git fetch https://github.com/<user>/gym.git <branch> && git merge FETCH_HEAD`.

**VERSION.** `const VERSION` (shown beside the wordmark, so a stale phone is obvious) belongs to main. Its form is
`YYYY.MM.DD-N`, N counting main's commits that day.

- A pull request does not touch the `VERSION` line. Two pull requests that both bump it conflict with each other.
- Main bumps it once for each commit or merge it lands, then checks the live page shows it.
- On your own fork's `main` you may add a tag after main's value so your phone shows your build
  (`"2026.11.18-5+sam2"`), in one of *your* commits. When you merge upstream, take main's value and put your tag
  back. To check your Pages copy without it: `gh api repos/<user>/gym/pages/builds/latest --jq '.status, .commit'`.

**On main only** (the owner's agent), when merging a plan that should be listed:

1. Append its card to `CARDS` (`["id", "Name"]`) and its new lifts to `LIFTS` (`["Name", "log"]`), at the end.
2. `node tools/fixtures.js <name>` writes a fixture that uses the new lines. Commit both files with the lines.
3. Bump `VERSION`, `node tools/check.js`, push, wait for the Action and for the live page to show the version:
   `curl -s "https://xbloooooo.github.io/gym/?t=$RANDOM" | grep -o 'const VERSION = "[^"]*"'`.

## Changing the page itself

- **Look.** One design: Barlow and Barlow Condensed, the colour tokens at the top of the styles, two themes
  (`default`, and `stealth` for dark). New screens use the same tokens and should look like part of the same app.
  Check both themes.
- **It is used on a phone, one-handed, between sets.** One column, large buttons. What phones impose, and the code
  already follows: tap targets at least 44 px; text boxes 16 px or more, or iOS Safari zooms on focus; bars read
  `env(safe-area-inset-*)` and heights use `dvh`; copy and the share sheet only work straight from a tap, so
  nothing may be awaited between the tap and the call; there is no vibration on iPhone and sound may be off, so the
  end of a rest has to be visible.
- **What leaves the page.** The log leaves only as a save code (Finish copies it), a save image, or the JSON file;
  one workout can leave as a share-card picture. There is no plain-text summary, on purpose.
- **Testing.** Opening `index.html` from disk works for most things; the clipboard, the save image and OCR need
  http (`python3 -m http.server` in the repo). Use the browser's phone emulation. Test with made-up workouts in your
  test browser only: never put demo data in anyone's real storage, and never commit anyone's real log.
- **Docs.** A change in behaviour updates `README.md` (for users) in the same commit; a change in how to work on the
  repo updates this file.

## Ideas, not built

Nothing here exists yet. Each would be welcome as a pull request; talk to the owner first about anything that
touches the save code.

- **A plan builder in the page**: make and edit plans on the phone instead of editing `ROUTINES`.
- **A plan importer**: from a Hevy routine link, a CSV export, or pasted text. Today an agent does this by hand.
- **Plans as data, not code.** While plans live in `ROUTINES`, every fork edits the same lines and syncing from main
  conflicts there. Plans stored on the phone (and shareable as their own kind of code) would end that.
- **A legs plan and an easy day** for the example gyms (card numbers 3, 4, 7 and 8 are held for them).
- **Working offline** (a service worker). The page currently has to load from the network.
- **Kilograms.** Everything is labelled lb.
