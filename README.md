# Afterglow Cover Lab

[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/RenaldiRenaldi/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/RenaldiRenaldi/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Compose a Vice City poster from the photographs already on your device. Each custom-shaped frame can use a different photo and has its own zoom and focus. Drag over the preview for a quick crop adjustment, then export a square, portrait, story or landscape PNG, each sized for social sharing.

Open `app/index.html` from any local static server. From this repository, run `node serve.ts` and open http://localhost:8080. No fonts, scripts, photos or requests are fetched from the internet; uploaded images stay in your browser.

The two included sample images are ready to use, or add your own photographs. Edit the headline directly in the panel and tap any frame to change its image and crop.

R2 brings the editor to five layouts and six global and per-panel grades, adding editable character tags and scene lines, Flip / Swap next, Undo / Redo and Surprise me. Poster credits are on by default: an invented review publication, five stars, a ticket, barcode, production footer and tagline band. Toggle them in Layout + Finish. Every panel uses a photo with a crop that covers its whole frame; new panels fill automatically from the local library.

The sample cast remains the original two photos. New generated photos were skipped because this build session had no built-in image generation tool. Detail crops are alternate views of those photos, not additional people or new photographs.

## Local verification

Run `node scripts/screenshots.mjs` before committing. It reads the actual JPEG headers and rejects dimensions that differ from `shots.json`, long sides over 1280, short sides below 480, or files over 256 KiB. Also run `file screenshots/*.jpg` and view all four captures.

To recapture, start `node serve.ts`. Set `PLAYWRIGHT_MODULE` to the existing Playwright installation's `index.mjs` and `CHROMIUM_BINARY` to the Chromium binary already in `~/.cache/ms-playwright`, then run `node scripts/screenshots.mjs --capture`. Captures use the manifest viewport, device scale 1 and `fullPage: false`; the editor export button must fit inside its screenshot. No browser install is needed. `CAPTURE_URL` optionally selects another local server URL.

With the same environment and server, `node scripts/editor-check.mjs` verifies history restoration, all grades and layouts, tags, flip / swap, furniture, Surprise me and the actual dimensions of all four exported PNGs. The server build is `MAKEFUN_OUTPUT_DIR=/tmp/afterglow-r2-output node main.ts`; run twice and compare dossier hashes. Sealing, submission and the exact-bundle `makefun check` belong to the parent workflow.
