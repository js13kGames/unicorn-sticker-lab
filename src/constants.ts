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
