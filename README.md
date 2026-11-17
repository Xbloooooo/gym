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
- `LANES` — Home / Work / Day-pass. A routine belongs to a lane by its id prefix (`work_`, `unity_`, none = home).
- `ROUTINES` — the cards. Same object shape as the design doc, so an existing `ROUTINES` array pastes straight in.
- `CARD_IDS`, `LIFTS` — numbered lists the save code uses in place of names. **Append only**: a new or renamed lift
  gets a new line at the end, and no line is ever reordered, removed or reused, or codes already written down
  would name the wrong lift. A lift missing from the list still works; its name is spelled out in the code.

When open loads change, change the exercise (`defaultWeight`, `defaultReps`, `target`, `note`), the routine `blurb`
and `TARGETS` in the same commit. Then:

    node tools/check.js          # syntax check, and says which cards or lifts are missing from the numbered lists
    git commit -am "..." && git push

Pages republishes in about a minute. Pages caches for 10 minutes; reload the phone until the version matches.

Six cards so far: Pull and Push in each lane, all starting from the Hevy "Comeback Pull" / "Comeback Push" routines. They are separate objects; a session graded at one gym changes that gym's card only.

## Where the log lives

`localStorage["gym_tracker_v1"]` in that one browser, for the `xbloooooo.github.io` origin:
`{ workouts, draft, theme, backup }`. Nothing is uploaded anywhere.

- Safari on iPhone can clear a site's storage after seven days of browser use without a visit. A page added to the
  Home Screen is exempt, and has its own separate storage, so pick one way of opening it and stick to it.
- The home screen shows how many workouts are not in the last full backup.

## Backup

History → Backup & restore.

- **Current code** — every finished workout on the phone as letters, one code that can cover any number of days. It
  is rebuilt whenever the history changes, so the latest copy replaces any older code. The page shows every line of
  it whole, so a plain screenshot of the page can be read back; a code longer than the screen takes several
  screenshots, picked together.
- **Codes add up.** Add a code, then another, or paste several together, in any order, with other text around them, and
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

### Save code format (format 4)

There is no compatibility between formats before 1.0: a code is read only by the format that wrote it. When the
format changes, copy a fresh code from the new page (the log on the phone is not affected by a format change).

    record  = the list above, per workout, sorted by start time            canon()
    body    = the record through an adaptive range coder                    logCodec(), coder()
    bytes   = [4, crc32(body) x4, len(body) x2] + body
    letters = 2 per byte from "ACDEHKLNPRSTUXYZ"
    lines   = 40 letters + 4 check letters (crc32 of "<body crc>:<line number>:<letters>", low 16 bits)

The body is short because almost everything is written as a guess that turned out right:

- a card or a lift is its number in `CARD_IDS` / `LIFTS`;
- the list of lifts is guessed to be the one that card had last time;
- a weight is guessed to be the weight of the set before it, or what that lift opened with last time on that card;
- reps are guessed to be what the same set got last time;
- a wrong guess is written as the step up or down from the guess.

The coder (the binary range coder from LZMA, whole-number arithmetic only) learns how often each kind of guess is
right, so a right one costs a fraction of a bit. Guesses use only what is earlier in the same code plus the two
numbered lists, never the current text of a card, so editing a card does not change what an old code means.
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

## Files

    index.html             the app: styles, program, code
    manifest.webmanifest   name and icons for Add to Home Screen
    fonts/                 Barlow, Barlow Condensed (OFL 1.1), Cousine (Apache 2.0)
    ocr/                   tesseract.js 7.0.0, tesseract.js-core 7.0.0, English data (Apache 2.0); loaded only when an image is read
    tools/check.js         syntax check, and checks the cards against the numbered lists
    tools/make_icons.py    redraws the icons

No build step. Not offline: the page has to load from the network.
