# Gym

Phone-first workout logger. One page, no account, no server of ours: GitHub Pages serves the files, the phone keeps the log.

Live: https://xbloooooo.github.io/gym/

## The phone it is built for

Howl's iPhone Air, in Safari: 420 × 912 CSS px at 3×, safe area 62 px top and 34 px bottom. Check every layout change
at that size first (in Chrome: 420×912, DPR 3, safe-area insets 62/34). What the phone imposes:

- every tap target is at least 44 px, and every text box is 16 px or more, or Safari zooms the page on focus;
- the bar, the dock and the toast read `env(safe-area-inset-*)`; heights use `dvh`, since Safari's bars cover part of `vh`;
- there is no vibration on iPhone and the beep is silent when the ringer switch is off, so the end of a rest has to be
  readable on the screen alone;
- copying only works straight from a tap, so nothing slow may run between the tap and the copy.

## Changing the program

Everything a session reads is at the top of the script in `index.html`:

- `VERSION` — bump on every edit. It shows next to the wordmark, so a stale phone is obvious.
- `TARGETS` — the "Due next" card on the home screen. Written by hand when a session is graded.
- `LANES` — Home / Work / Day-pass. A routine belongs to a lane by its id prefix (`work_`, `eos_`, none = home).
- `ROUTINES` — the cards. Same object shape as the design doc, so an existing `ROUTINES` array pastes straight in.
- `CARDS`, `LIFTS` — numbered tables the save code uses in place of names. **Append only**: no line is ever
  reordered, removed, reused or edited, or codes already written down would name the wrong card or lift. A card
  that is taken off the page keeps its line, so its old workouts keep their name. A card or lift missing from the
  tables still works; its name is spelled out in the code.

When open loads change, change the exercise (`defaultWeight`, `defaultReps`, `target`, `note`), the routine `blurb`
and `TARGETS` in the same commit. Then:

    node tools/check.js          # syntax check, the cards against the numbered tables, a save-code round trip
    git commit -am "..." && git push

Pages republishes in about a minute. Pages caches for 10 minutes; reload the phone until the version matches.

Six cards so far: Pull and Push in each lane, all starting from the Hevy "Comeback Pull" / "Comeback Push" routines. They are separate objects; a session graded at one gym changes that gym's card only.

## What the page fills in during a session

The aim is that a set done as expected is one tap on its check. Everything below is a guess made for speed, written
down so it is easy to find and change (the code is under "what the page fills in" in `index.html`).

- **A session starts as a copy of last time on that card**: same weight and reps, set by set. History beats the
  card's `defaultWeight` / `defaultReps`; those only fill a lift never logged on that card. So bumping a default in a
  card no longer changes what the boxes show once the lift has history; the `target` text still shows.
- **Loads never come from another card.** Work Pull does not start from Home Pull's numbers.
- **A lift with no history and no `defaultWeight`** opens at the number its `target` text starts with
  (`"12.5–15"` → 12.5). A target that starts with a word fills nothing. With no `defaultReps`, reps open at the
  bottom of the rep range (`"10-12"` → 10).
- **The set being worked on** is the first unchecked one, or the one whose box was tapped. It gets four buttons under
  it: weight down/up by one plate, reps down/up by one.
- **A plate** is 5; dumbbells up to 25 and cables under 20 (or sitting on a half step) move by 2.5. An exercise can
  set its own with `step: 10`.
- **Changing a set's weight**, by button or by typing, also changes the unchecked sets after it that had the same
  weight. Reps do not carry.
- **Tapping a box selects its contents**, so typing replaces rather than appends. Checking a set puts the keyboard away.
- **Checking the last set of a lift** scrolls to the next lift with sets open.
- **Check all** marks the rest of a lift's sets done as written and starts one rest. **+ Set** adds a set like the last.
- **Move up**: when every set reached the top of the rep range last time at one weight, the lift offers the next
  weight (less assist on assisted lifts) with reps at the bottom of the range. It is an offer; nothing changes unless
  it is tapped.
- Unchecked sets are never logged, so a prefilled set that was not done costs nothing.

## How a weight is drawn

A set's weight never has "lb" written beside it; the drawing says what the number is. The same three marks are used
on the logging screen, on a workout's page, and in the change tags (`+5` followed by a small dumbbell or weight).

| The lift's `log` | Drawn as | Means |
|---|---|---|
| `db` | a small dumbbell on each side of the number | weight per hand |
| `cable`, `machine`, `bar`, `kb` | the number on a weight block (a trapezoid with a handle loop) | the stack, the bar with its plates, the bell |
| `assist` | the number in parentheses, `(100)` | the assist pin: help, not load |
| `bodyweight`, or no number | nothing | |

On the logging screen the block is the weight box itself; on a workout's page each set of a block lift is a
weight-shaped tile and the best set is the solid one. Units stay only where a number would be ambiguous: volume.
All of it is inline SVG in the theme's colours (`dbSVG`, `blockSVG`, `UNIT` in `index.html`), display only.

## A workout's page

History → a workout. Weekday, gym and date, start–finish and minutes, then three numbers: lifts done out of the
card's total, sets, and volume. Under that the session note, then one card per lift that has checked sets: an
equipment pill and its sets as weight × reps tiles, three to a row, with the best set marked (heaviest, then most
reps; on an assisted lift the lowest pin). A lift card shows no total: the session's volume in the strip at the top
is the only total weight on the page, because a total beside the sets read as one more set weight. Lifts with nothing checked are folded into one "Skipped" line.
The History list shows sets and volume per workout.

**Volume** is weight × reps over checked sets. A dumbbell lift is logged per hand and counts both hands (40 × 8 is
640 lb), an assisted lift is left out because its number is the assist pin, and a set without a number counts
nothing. A lift done one arm at a time with a dumbbell is therefore counted double.

Beside each lift is what changed since the last time that lift was logged on the same card: top weight, number of
sets, and reps over the sets both days have (`+5 ⚖ · −1 rep`, `+1 set · +2 reps`, `Same as last`, `First log`).
It is in the accent colour when the load went up, or the load held and reps (or sets) went up; on assisted lifts a
lower pin counts as up. The page shows only what was lifted, so a workout restored from a save code looks the same
as one logged on the phone.

## Share card

One picture of one workout, for sending to someone. **Share** is in the bar of a workout's page and at its foot, and
on every row of the History list; finishing a session opens the new workout's page, so it is one tap away.

- **On it**: weekday, date and gym (Home, Office gym, EoS); the workout's name; minutes, sets and volume; then one
  line per lift with its sets as small tiles carrying the marks above (dumbbells for per hand, a weight block,
  parentheses for an assist pin), the best set marked. Three sets or fewer sit beside the name; more go on a line
  under it.
- **Not on it**: lifts with nothing checked, the change tags, the note, the save code.
- **Size**: 420 wide, as tall as it needs. Ten lifts of two or three sets come to about 815, inside one iPhone Air
  screen; past 900 the rows tighten, and whatever the height, the picture is scaled to fit the screen.
- **Sharing**: the card is drawn on a canvas at 3× in the theme's colours, light or dark as the page is, and handed
  to the phone's share sheet as a PNG (`navigator.share` with a file). It is drawn inside the tap with nothing
  awaited, because the sheet only opens straight from a tap. The card stays on screen behind the sheet.
- **Where a browser cannot share a file**, the card is shown full screen: tap it to hide the buttons and take a
  screenshot, or press and hold it to save it.

It is drawn from the log at the moment of the tap; nothing is stored for it and nothing about the save code changes.

## Progress

History → Progress: the whole log in pictures, for all gyms or one (the chips at the top).

- **Three numbers**: workouts, sessions per week over the last four weeks (fewer if the log is younger), total volume.
- **Lift progress**, the headline chart: pick a lift; its best set of each session over time, or the estimated
  one-rep max (weight × (1 + reps ÷ 30), best over the session's sets). One line per card, because loads do not carry
  between gyms: solid for the card the lift is done most on, then dashed, then dotted, three at most.
  An **assisted lift** plots the pin upside down, so a lower pin (less help) is higher and up is always progress.
  A lift with no load plots the reps of its best set.
- **Training days**: the last 16 weeks as a calendar, Monday at the top, one square per day, darker for more sets
  (up to 10, up to 18, more). Today is outlined.
- **Volume per week**: the same 16 weeks as bars, the current week in the accent colour, the number of sessions under
  each bar.
- **Every lift**: latest best set, change since its first log on its main card, and a small trend. Tapping one
  charts it.

Everything is drawn as inline SVG from the log on the phone at the moment the page opens; nothing is stored for it
and no chart library is loaded. With one workout the calendar has one square, the week chart one bar and each lift
one dot with "the line starts with the next one"; with none, the page says so and keeps its shape.

## Where the log lives

`localStorage["gym_tracker_v1"]` in that one browser, for the `xbloooooo.github.io` origin:
`{ workouts, draft, theme, backup }`. Nothing is uploaded anywhere.

- Safari on iPhone can clear a site's storage after seven days of browser use without a visit. A page added to the
  Home Screen is exempt, and has its own separate storage, so pick one way of opening it and stick to it.
- The home screen shows how many workouts are not in the last full backup.

## Backup

The page hands out the log as one thing: the save code. There is no plain-text summary to copy; a single workout can
be sent as a picture (Share card, above) and read on its History page, and a code is turned back into readable workouts with `tools/decode.js` (below).

- **Finish copies the code.** Finishing a session puts the current code, the whole history with the new workout in
  it, on the clipboard. Each one replaces the one before, so only the newest needs keeping. If the copy is refused
  the page opens Backup with the code selected. Otherwise it opens the workout just saved, where Share is.

History → Backup & restore.

- **Current code** — every finished workout on the phone as letters, one code that can cover any number of days. It
  is rebuilt whenever the history changes, so the latest copy replaces any older code. The page shows every line of
  it whole, so a plain screenshot of the page can be read back; a code longer than the screen takes several
  screenshots, picked together.
- **Codes add up.** Add a code, then another, or paste several together, in any order, end to end or with other text around them, and
  the workouts in them are added to what is on the phone. A workout already there is skipped (same card, same start
  minute), so overlapping codes and pasting twice are harmless. Nothing on the phone is removed, and the phone's own
  copy of a workout is never swapped for the thinner one in a code.
- **Save image** — the full code drawn as a PNG. The exact text also rides inside the file (a `tEXt` chunk), so the
  original image reads back without OCR. A screenshot or a re-compressed copy is read by OCR. Several images can be
  picked at once; screenshots of different codes merge the same way pasted text does.
- **JSON file** — raw export/import, the only complete copy. Import accepts a file that is just `{ workouts, draft }`,
  which is how the log comes over from the old tracker. Importing a file is the one thing that *replaces* the log,
  after a confirm.

### What a code holds, and what it leaves out

Held: for each workout the card, the start minute, the length in minutes, the session note, and for each lift the
checked sets (weight x reps), whether it was optional and whether it was skipped.

Left out, to keep it short: unchecked sets, the unfinished session, the theme, seconds, and the card text of the day
(target, cue, note, rep target, rest, form link). A workout that comes back from a code shows what was lifted, not
what the card said that day.

Weights are kept exactly when they are a multiple of 0.25 up to 999999.75, reps when they are a whole number up to
9999; anything else typed in those boxes is kept as text (up to 40 characters), which costs more letters. Notes are
kept up to 300 characters. Dates before 2020 are not representable.

### Save code 1.0 (format 4)

The format is frozen. A code written by any copy of the page reads the same on every other copy, now and later:
adding a workout plan, removing one or editing one does not change what a code already written down means. A
workout on a plan that has since been removed still comes back under that plan's name. If the format ever has to
change, the new one gets its own number and format 4 stays readable.

A code from a newer copy can name a card or lift this copy has no number for yet; the page then says so and adds
nothing, instead of guessing a name. Update the page and add the code again.

    record  = the list above, per workout, sorted by start time            canon()
    body    = the record through an adaptive range coder                    logCodec(), coder()
    bytes   = [4, crc32(body) x4, len(body) x2] + body
    letters = 2 per byte from "ACDEHKLNPRSTUXYZ"
    lines   = 40 letters + 4 check letters (crc32 of "<body crc>:<line number>:<letters>", low 16 bits)

The body is short because almost everything is written as a guess that turned out right:

- a card or a lift is its number in `CARDS` / `LIFTS`;
- the list of lifts is guessed to be the one that card had last time;
- a weight is guessed to be the weight of the set before it, or what that lift opened with last time on that card;
- reps are guessed to be what the same set got last time;
- a wrong guess is written as the step up or down from the guess.

The coder (the binary range coder from LZMA, whole-number arithmetic only) learns how often each kind of guess is
right, so a right one costs a fraction of a bit. Guesses use only what is earlier in the same code plus the two
numbered tables, never the cards themselves, so editing, adding or removing a card does not change what an old code
means.
One function walks the record for both writing and reading, and every code is read back and compared before it is
shown; if that ever fails the page says so instead of showing a code.

Measured with the current cards: one workout is 3–4 lines (about 100 letters). With steady loads and reps that wobble,
20 workouts are about 860 letters and 150 workouts about 3,900 (88 lines); with loads picked at random every time,
150 workouts are about 5,500. The first format needed 1,212 letters for one workout and 20,788 for 150.

Only those 16 letters are used because Tesseract does not confuse them with one another; with digits mixed in it
misread up to half the lines in testing. The check letters tie every line to its code and its place in it, so lines
from many codes can arrive mixed, out of order or twice and still be sorted; a missing line is named, and a single
wrong, dropped or doubled letter is repaired. The CRC-32 covers each code. Lines with digits in them are treated as
prose and ignored.

A phone screen shows about 40 lines of the code on the Backup page. A save image holds 180 lines.

### Reading a code off the phone

    node tools/decode.js < code.txt            every workout in the pasted text, readable
    node tools/decode.js --last 1 < code.txt   only the newest
    node tools/decode.js --json < code.txt     the page's own workout objects

It takes what the page takes: one code or many, in any order, end to end or with other text around them, and merges
them the same way. It runs the code functions straight out of `index.html` (`tools/page.js`), so it reads exactly
what the page reads.

## Files

    index.html             the app: styles, program, code
    manifest.webmanifest   name and icons for Add to Home Screen
    fonts/                 Barlow, Barlow Condensed (OFL 1.1), Cousine (Apache 2.0)
    ocr/                   tesseract.js 7.0.0, tesseract.js-core 7.0.0, English data (Apache 2.0); loaded only when an image is read
    tools/check.js         syntax check, cards against the numbered tables, and a save-code round trip in node
    tools/decode.js        save code(s) → readable workouts
    tools/page.js          loads the cards and the save-code functions out of index.html for the two tools above
    tools/make_icons.py    redraws the icons

No build step. Not offline: the page has to load from the network.
