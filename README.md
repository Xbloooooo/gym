# Gym

Phone-first workout logger. One page, no account, no server of ours: GitHub Pages serves the files, the phone keeps the log.

Live: https://xbloooooo.github.io/gym/

## Changing the program

Everything a session reads is at the top of the script in `index.html`:

- `VERSION` — bump on every edit. It shows next to the wordmark, so a stale phone is obvious.
- `TARGETS` — the "Due next" card on the home screen. Written by hand when a session is graded.
- `LANES` — Home / Work / Day-pass. A routine belongs to a lane by its id prefix (`work_`, `unity_`, none = home).
- `ROUTINES` — the cards. Same object shape as the design doc, so an existing `ROUTINES` array pastes straight in.

When open loads change, change the exercise (`defaultWeight`, `defaultReps`, `target`, `note`), the routine `blurb`
and `TARGETS` in the same commit. Then:

    node tools/check.js          # syntax check of the inline script
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

- **Current code** — everything on the phone as letters, one code that can cover any number of days. It is rebuilt
  whenever the history changes, so the latest copy replaces any older code.
- **Codes add up.** Add a code, then another, or paste several together, in any order, with other text around them, and
  the workouts in them are added to what is on the phone. A workout already there is skipped (same card, same start
  second), so overlapping codes and pasting twice are harmless. Nothing on the phone is removed. If the phone has
  no unfinished session, the newest one found in the codes comes along.
- **Save image** — the full code drawn as a PNG. The exact text also rides inside the file (a `tEXt` chunk), so the
  original image reads back without OCR. A screenshot or a re-compressed copy is read by OCR. Several images can be
  picked at once; screenshots of different codes merge the same way pasted text does.
- **JSON file** — raw export/import. Import accepts a file that is just `{ workouts, draft }`, which is how the log
  comes over from the old tracker. Importing a file is the one thing that *replaces* the log, after a confirm.

### Save code format

    payload = JSON [1, theme, workouts[], draft]   (sessions packed as arrays, times in epoch seconds)
    bytes   = [2, flags, crc32(body) x4, len(body) x3] + body     flags bit 0: body is deflate-raw
    letters = 2 per byte from "ACDEHKLNPRSTUXYZ"
    lines   = 40 letters + 4 check letters (crc32 of "<body crc>:<line number>:<letters>", low 16 bits)

Only those 16 letters are used because Tesseract does not confuse them with one another; with digits mixed in it
misread up to half the lines in testing. The check letters tie every line to its code and its place in it, so lines
from many codes can arrive mixed, out of order or twice and still be sorted; a missing line is named, and a single
wrong, dropped or doubled letter is repaired. The CRC-32 covers each code. Lines with digits in them are treated as
prose and ignored. Format 1 (first day; check was "<line number>:<letters>") is still read.
A code keeps the fields in the design doc's session shape; anything else on a session is only in the JSON export.

A code for one workout is 19–30 lines with the current cards; a phone screenshot shows about 50 lines. A save image holds 180 lines.

## Files

    index.html             the app: styles, program, code
    manifest.webmanifest   name and icons for Add to Home Screen
    fonts/                 Barlow, Barlow Condensed (OFL 1.1), Cousine (Apache 2.0)
    ocr/                   tesseract.js 7.0.0, tesseract.js-core 7.0.0, English data (Apache 2.0); loaded only when an image is read
    tools/check.js         syntax check
    tools/make_icons.py    redraws the icons

No build step. Not offline: the page has to load from the network.
