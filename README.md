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

`pull` and `push` are the real Hevy "Comeback Pull" / "Comeback Push" cards. The other cards are starters: placeholder exercise names, loads unset.

## Where the log lives

`localStorage["gym_tracker_v1"]` in that one browser, for the `xbloooooo.github.io` origin:
`{ workouts, draft, theme, backup }`. Nothing is uploaded anywhere.

- Safari on iPhone can clear a site's storage after seven days of browser use without a visit. A page added to the
  Home Screen is exempt, and has its own separate storage, so pick one way of opening it and stick to it.
- The home screen shows how many workouts are not in the last backup.

## Backup

History → Backup & restore.

- **Save string** — the whole log as letters. Copy it anywhere text goes.
- **Save image** — the same string drawn as a PNG. The exact text also rides inside the file (a `tEXt` chunk),
  so the original image restores without any reading. A screenshot or a re-compressed copy is read by OCR.
- **JSON file** — raw export/import. Import accepts a file that is just `{ workouts, draft }`, which is how the log
  comes over from the old tracker.

Restore always replaces what is on the phone, after a confirm.

### Save string format

    payload = JSON [1, theme, workouts[], draft]   (sessions packed as arrays, times in epoch seconds)
    bytes   = [1, flags, crc32(body) x4, len(body) x3] + body     flags bit 0: body is deflate-raw
    letters = 2 per byte from "ACDEHKLNPRSTUXYZ"
    lines   = 40 letters + 4 check letters (crc32 of "<line number>:<letters>", low 16 bits)

Only those 16 letters are used because Tesseract does not confuse them with one another; with digits mixed in it
misread up to half the lines in testing. Line checks let the reader place lines from several screenshots in any
order, tell which lines are missing, and repair a single wrong, dropped or doubled letter. The CRC-32 covers the whole.
The string keeps the fields in the design doc's session shape; anything else on a session is only in the JSON export.

One image holds 180 lines, roughly 55 workouts. A phone screenshot shows about 50 lines, roughly 9 workouts.

## Files

    index.html             the app: styles, program, code
    manifest.webmanifest   name and icons for Add to Home Screen
    fonts/                 Barlow, Barlow Condensed (OFL 1.1), Cousine (Apache 2.0)
    ocr/                   tesseract.js 7.0.0, tesseract.js-core 7.0.0, English data (Apache 2.0); loaded only when an image is read
    tools/check.js         syntax check
    tools/make_icons.py    redraws the icons

No build step. Not offline: the page has to load from the network.
