import { COMPONENTS, drawOutlined, stampSilhouette } from './components'
import { SHARED_OUTLINE_COLOR } from './constants'
import type { Placed } from './types'

export interface Snapshot {
  // the cluster's own pieces at print time, in their original canvas
  // coordinates - re-rendered on demand rather than storing pixels, per
  // the Placement & Composition Ideas doc's "cheap to build" framing (a
  // sticker is already a small data structure)
  pieces: Placed[]
  // which recipe this print satisfied, or null for a valid-but-unnamed
  // custom creation (still a real sticker, still worth keeping - GDD §14's
  // "Failure" outcome is explicitly still a sticker, not a wasted print)
  recipeId: string | null
  at: number
}

// keeps the running "every print" journal from growing without bound over
// a long session - curation (favorite/delete/etc) was left as an open
// question in the doc; a simple cap answers it for now without needing a
// whole UI for it
const ALBUM_CAP = 40

// appends and caps in one step - oldest entries fall off the front once
// the journal is full, so `album` always stays newest-last
export function addToAlbum(album: Snapshot[], pieces: Placed[], recipeId: string | null): Snapshot[] {
  const next = [...album, { pieces, recipeId, at: Date.now() }]

  return next.length > ALBUM_CAP ? next.slice(next.length - ALBUM_CAP) : next
}

// a rough half-extent for framing purposes only - doesn't need to match
// any single component's real geometry exactly, just be generous enough
// that nothing gets cropped
const FRAME_PAD = 50

function boundingBox(pieces: Placed[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  pieces.forEach((p) => {
    const r = FRAME_PAD * p.scale

    minX = Math.min(minX, p.x - r)
    minY = Math.min(minY, p.y - r)
    maxX = Math.max(maxX, p.x + r)
    maxY = Math.max(maxY, p.y + r)
  })

  return {
    minX, minY, maxX, maxY,
  }
}

// Renders a snapshot's pieces into a size*size square at the canvas's
// current origin - used for both the Album grid and Collection's
// per-recipe thumbnails. Deliberately simpler than the main render(): no
// effects, no flourishes, reframed to fit the *cluster's* own bounding box
// rather than assuming it's still centered on the original 400x400 canvas
// the way it was at print time. It does keep both outlines from the main
// render, though (load-bearing decision #2) - a snapshot is always of an
// already-printed cluster (single stray stickers get swept, never
// snapshotted), so leaving out the shared white margin behind it made
// overlapping pieces read as each keeping its own separate black outline
// instead of merging into one sticker, the same visual bug the shared
// margin exists to prevent everywhere else.
export function renderSnapshot(ctx: CanvasRenderingContext2D, pieces: Placed[], size: number): void {
  ctx.clearRect(0, 0, size, size)
  if (pieces.length === 0) return

  const box = boundingBox(pieces)
  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY, 1)
  const fit = (size * 0.85) / span
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2

  const placeOf = (p: Placed, scale: number) => (): void => {
    ctx.save()
    ctx.translate(size / 2 + (p.x - cx) * fit, size / 2 + (p.y - cy) * fit)
    ctx.rotate(p.rotation)
    ctx.scale(p.flip ? -scale : scale, scale)
    COMPONENTS[p.type](ctx, p.color)
    ctx.restore()
  }

  // Both outline widths below are constant-on-screen-pixels regardless of
  // scale, same reasoning as the main render() (decision #3) - but sized
  // relative to `size` rather than reused from OUTLINE_WIDTH/
  // PRINTED_OUTLINE_WIDTH directly. Those constants render as a fixed 8px/
  // 26px on the 400px main canvas; applied unscaled to a 32-64px
  // thumbnail they'd swallow the whole sticker. (`stampSilhouette`'s width
  // param becomes 2x the actual on-screen stroke - see blob() in
  // components.ts - so target/(2*scale) here, not target/scale.)
  pieces.forEach((p) => {
    const scale = p.scale * fit

    stampSilhouette(ctx, placeOf(p, scale), SHARED_OUTLINE_COLOR, (size * 0.09) / (2 * scale))
  })
  pieces.forEach((p) => {
    const scale = p.scale * fit

    drawOutlined(ctx, placeOf(p, scale), (size * 0.05) / (2 * scale))
  })
}
