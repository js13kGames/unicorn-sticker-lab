# Unicorn Sticker Lab

A tiny sticker-making game for [js13kGames](https://js13kgames.com/): drag
magical pieces together, print them into finished stickers, and discover
the secret combinations that give them names.

## How to play

- Tap a piece in the tray at the bottom to add it to the canvas, then
  drag it into position.
- Overlap two or more pieces, then tap **Sticker it!** to combine them.
  A combination that matches one of the game's hidden recipes gets
  discovered (with a name, sound, and a little fanfare); anything else
  still becomes a real "custom" sticker, just without a name - printing
  never throws your work away. A single piece with nothing overlapping
  it just gets swept off the canvas instead.
- The banner next to the studio mascot (above it on narrow screens,
  under it on wide ones) nudges you toward a *kind* of thing to try
  ("make something that sparkles") rather than one specific
  answer - several different combos can satisfy it. Once every kind has
  been tried at least once, it starts naming one specific undiscovered
  recipe instead.
- **Collection** lists every recipe you've found so far, plus a riddle
  hint (and a `???` per ingredient) for the ones you haven't.
- **Album** is a running journal of every sticker you've ever printed,
  discovery or not. Tap one to see it bigger, save it as a PNG, or
  delete it.
- New pieces, color-matching, layering, and effects (sparkle/glow/hearts)
  unlock gradually as you discover more recipes - locked ones are tappable
  too, and explain themselves with a toast instead of just sitting there
  disabled.
- Discover all 16 recipes for a bonus piece: googly eyes that actually
  watch your cursor around the canvas.

## Development

Requires [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm run dev
```

`dev` starts an esbuild dev server (with live rebuilds) at
`http://localhost:8000`.

```bash
pnpm test      # jest
pnpm run eslint
```

## Production build

```bash
pnpm run build-prod
```

This bundles and minifies with esbuild, packs the resulting JS with
[Roadroller](https://github.com/lifthrasiir/roadroller) (inlined
directly into `build/index.html` in place of a `<script src>`), zips
`build/` with `bestzip`, and prints the final size against js13k's
13,312-byte (13 KB) limit via `check-size.js`. `pnpm run prod` does the
same and also lints and serves the result locally at
`http://localhost:3030` for a final check.

Roadroller's output is packed via its library API (`roadroll.js`), not
copy-pasted from its web tool - the packed payload is sensitive to
exactly the kind of byte-mangling a clipboard or text field can
introduce, so it's read/written straight to disk instead.

## Project structure

- `index.ts` - the game itself: canvas rendering, drag/drop, the print
  (combine) flow, unlocks, save/load wiring, and all the DOM/event glue.
- `components.ts` - how each sticker piece (and the mascot) is actually
  drawn, plus the shared outline/silhouette technique used everywhere.
- `recipes.ts` - the list of discoverable combinations, their names, and
  their hints.
- `progression.ts` - which pieces/effects/recipe sizes are unlocked at
  which discovery count.
- `requests.ts` - the category-based "Try:" banner above the canvas.
- `effects.ts` - the sparkle/glow/hearts decorations.
- `album.ts` - the print journal and its thumbnail/snapshot rendering.
- `mascot.ts` - the little animated studio mascot.
- `audio.ts` / `music.ts` - procedural sound effects and the background
  music loop (no audio files - everything's synthesized with the Web
  Audio API).
- `save.ts` - localStorage persistence.
- `styles/` - `game.css` plus `vars.js`, a tiny build-time variable
  substitution for shared colors/sizes (see `esbuild-prod.js`/`esbuild.js`).

## Why so small?

js13kGames caps entries at 13 KB, zipped. There are no external assets -
every sticker, sound, and animation is drawn or synthesized in code -
and the production build squeezes further via Roadroller's own
compression on top of esbuild's minification.
