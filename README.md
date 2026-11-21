# Rainline Cover Lab

[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/RenaldiRenaldi/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/RenaldiRenaldi/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Build a Rainline film poster from local photographs. Tune the crop and color grade in each frame, then add character lines and film billing. The preview follows the selected export size. Download any of the four formats individually, or use Export All 3 PNGs for the square, portrait and landscape set.

Open `app/index.html` from any local static server. From this repository, run `node serve.ts` and open http://localhost:8080. No fonts, scripts, photos or requests are fetched from the internet; uploaded images stay in your browser.

The cast library uses just two included real photographs in different crops: Boulevard supplies Driver, Fixer, Rider and Getaway; Pier supplies Lookout, Voice and Skipper. Fixer, Voice and Getaway are flipped. The lead shows each person once, with separate car and fishing details. Its tagline is “ONE CITY · NO DRY LAND”; the story reads “ONE LAST CROSSING”. The woman wears sunglasses in the original photo. Add your own photographs, edit the headline directly in the panel and tap any frame to change its image and crop.

Rainline includes six layouts (including Slant Seven and Solo Poster), six global and per-panel grades, editable character tags and scene lines, Flip / Swap next, Undo / Redo and Surprise me. The default Hero lead has four panels: two portraits, a getaway detail and an east-channel detail, all cropped from the same two kit photos. Neon Night adds rain streaks and wet-road reflections. Poster credits include editable review and source, seal and ring, volume ticket, barcode, release line, billing footer and tagline ribbon. New panels fill automatically from the local photo library.

Each cast preset has its own crop. Fixer and Skipper use teal, Voice uses sunset, and the others follow the global grade (night by default). Hero uses four panels in landscape and five in portrait. The solo poster keeps its closer Boulevard Rider portrait and “ONE FACE · NO WAY HOME” tagline. There are no illustrated cast assets; the library contains role presets for two people.

## Local verification

Run `node scripts/screenshots.mjs` before committing. It reads the actual JPEG headers and rejects dimensions that differ from `shots.json`, long sides over 1280, short sides below 480, or files over 256 KiB. Also run `file screenshots/*.jpg` and view all four captures.

To recapture, start `node serve.ts`. Set `PLAYWRIGHT_MODULE` to the existing Playwright installation's `index.mjs` and `CHROMIUM_BINARY` to the Chromium binary already in `~/.cache/ms-playwright`, then run `node scripts/screenshots.mjs --capture`. Captures use the manifest viewport, device scale 1 and `fullPage: false`; the editor export strip must fit inside its screenshot. No browser install is needed. `CAPTURE_URL` optionally selects another local server URL.

With the same environment and server, `node scripts/editor-check.mjs` verifies history restoration, all grades and layouts, tags, flip / swap, furniture, Surprise me and the actual dimensions of all four exported PNGs. The server build is `MAKEFUN_OUTPUT_DIR=/tmp/rainline-output node main.ts`; run twice and compare dossier hashes. Sealing and submission are separate steps.

`node scripts/visual-check.mjs` uses that same cached browser to render 1024px and 512px comparisons against the two local R3 lead references, plus individual cast panels, into `/tmp/rainline-real-*` and `/tmp/rainline-panel-*`. Inspect these images after recapturing; the comparisons are local review artifacts only.
