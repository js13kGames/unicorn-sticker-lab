import type { ComponentType } from './types'

export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 400

export const OUTLINE_COLOR = '#2b2b2b'
export const OUTLINE_WIDTH = 4

// The thick shared border traced around the whole sticker's combined
// silhouette (like a die-cut sticker margin) - white, so the canvas
// background has to be dark enough for it to actually read against it.
export const SHARED_OUTLINE_COLOR = '#ffffff'
export const SHARED_OUTLINE_WIDTH = 8

// printed stickers get a chunkier version of the same margin - a
// persistent "this one's finished" cue that doesn't depend on selection,
// since printing removes the need to distinguish individual layers
export const PRINTED_OUTLINE_WIDTH = 13
export const CANVAS_BG = '#9b7fe8'

// matches vars.js's own $bg - duplicated by hand, same as CANVAS_BG/
// canvasBg above, since CSS vars and TS runtime constants are separate
// build-time systems with no shared source here. drawBgDrift (index.ts)
// paints this as an opaque fill behind the title screen's drifting pieces,
// standing in for #title's own CSS background (removed - see game.css)
export const PAGE_BG = '#efe3ff'

// Drawn with a dark halo underneath (see render()) so it stays visible
// regardless of what color happens to be under it.
export const SELECT_COLOR = '#ffd93d'

export const PALETTE = [
  '#ff6b9d', // pink
  '#ff4d4d', // red
  '#ff9f43', // orange
  '#ffd93d', // yellow
  '#6bcb77', // green
  '#4dd0e1', // cyan
  '#4d7cff', // blue
  '#a26bff', // purple
  '#ffffff', // white
  '#2b2b2b', // dark outline
]

export const DEFAULT_COLOR = PALETTE[0]

// each component's own natural color, for anywhere a piece is shown as
// itself rather than as something the player has actively recolored (tray
// icons, the title screen's decorative pieces) - DEFAULT_COLOR alone made
// every one of them read as "pink," even a cloud or a moon. rainbow's own
// draw function ignores its color argument entirely (it always draws its
// fixed RAINBOW_BANDS), so its entry here is unused but kept for type
// completeness.
export const NATURAL_COLOR: Record<ComponentType, string> = {
  unicorn: PALETTE[0], // pink
  rainbow: PALETTE[0],
  cloud: PALETTE[8], // white
  star: PALETTE[3], // gold
  heart: PALETTE[1], // red
  sun: PALETTE[2], // orange
  moon: PALETTE[8], // pale
  balloon: PALETTE[1], // red
}
