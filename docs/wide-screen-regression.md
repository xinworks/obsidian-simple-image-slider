# Wide-screen layout regression checklist

Run in Obsidian in both Reading and Live Preview modes, with the default theme
and any relevant custom theme. Use a slider containing 1023×934, 1908×690,
portrait, very small, and missing/broken images. Wait for images to load.

- On a 2560×1080 display with a wide note pane, the wide image uses the
  available pane width up to its natural size, without clipping or distortion.
- Narrow the pane, enable readable line length, and resize the window: the
  slider stays within the note; images keep their proportions and fit.
- On a short window and on mobile, the gallery respects the viewport height
  limit; portrait and ordinary images remain visible and uncropped.
- Switch by buttons, keyboard, index menu, mouse drag, and touch. Mixed aspect
  ratios must not change the canvas size or shift the surrounding note after
  all images have loaded. Wraparound and captions must still work.
- Resize during and after switching; navigation lands on the selected image.
  Check a single-image slider and re-render the note with a restored index.
- Check failed image loads and large galleries. The minimum frame remains
  usable, and loading images may initially change its height as they arrive.

The slider is limited by its containing note, not the full monitor. Disabling
Obsidian's readable line length or widening the pane may be needed to expose
more horizontal space.

## Automated browser regression

```sh
npm ci
npx playwright install chromium
npm run verify
npm run test:e2e
```

The E2E harness loads the production `main.js` and real `styles.css` in
Chromium. Only Obsidian's host API and DOM helpers are mocked. Images are
local SVG fixtures with explicit dimensions; no external image service is used.
This exercises the actual slider renderer and navigation handlers, but does not
validate Obsidian's code-block lifecycle, themes, Reading/Live Preview integration,
or Electron/mobile WebView differences.

Validation on 2026-10-27:

- 8 existing Node tests passed; TypeScript check and production build passed.
- 10 browser scenarios passed, including native Chromium touch input and
  resizing during a slide transition.
- Running the same wide-screen assertion against the baseline bundle and CSS
  fails: the 1908×690 fixture renders at 740×267.61 CSS pixels. With the fix,
  its displayed width exceeds 1800 CSS pixels in the same 2200px note pane
  on a 2560×1080 viewport.
- Browser page errors: none.
- The Obsidian-specific manual checklist above remains pending.

Screenshots are written to `test-results/` for local inspection.
