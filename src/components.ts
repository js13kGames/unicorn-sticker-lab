import { OUTLINE_COLOR, OUTLINE_WIDTH } from './constants'
import type { ComponentType } from './types'

type Draw = (ctx: CanvasRenderingContext2D, color: string) => void

// When set, every fill below is forced to this color instead of its real one,
// and outlineWidth is also non-null: every path additionally gets a round-
// joined stroke that dilates it outward by that many pixels. Used to stamp a
// component's full silhouette for the merged sticker outline (see
// stampSilhouette), so a shape's own internal seams (e.g. a white mane
// against a white body) never show their own separate borders, and sharp
// corners (star points, the horn) round off instead of fanning into spikes.
let paintOverride: string | null = null
let outlineWidth: number | null = null

function blob(
  ctx: CanvasRenderingContext2D,
  fill: string,
  path: () => void,
  rule: CanvasFillRule = 'nonzero',
): void {
  ctx.beginPath()
  path()
  ctx.fillStyle = paintOverride ?? fill
  ctx.fill(rule)

  if (outlineWidth !== null) {
    ctx.lineWidth = outlineWidth * 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = paintOverride as string
    ctx.stroke()
  }
}

function circlePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx + r, cy)
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
}

function dot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  circlePath(ctx, cx, cy, r)
  ctx.fillStyle = OUTLINE_COLOR
  ctx.fill()
}

// Everything except the eye, shared between the placeable sticker (small dot
// eye) and the mascot (big trackable eye) below.
function drawUnicornBody(ctx: CanvasRenderingContext2D, color: string): void {
  // tail
  blob(ctx, '#ffffff', () => {
    circlePath(ctx, 26, 6, 8)
    circlePath(ctx, 30, -6, 7)
    circlePath(ctx, 24, -14, 6)
  })
  // legs
  blob(ctx, color, () => {
    ctx.rect(-16, 18, 6, 16)
    ctx.rect(4, 18, 6, 16)
  })
  // body
  blob(ctx, color, () => {
    ctx.ellipse(0, 10, 22, 14, 0, 0, Math.PI * 2)
  })
  // mane
  blob(ctx, '#ffffff', () => {
    circlePath(ctx, -18, -18, 8)
    circlePath(ctx, -10, -24, 7)
    circlePath(ctx, -2, -26, 6)
  })
  // head
  blob(ctx, color, () => {
    circlePath(ctx, -20, -14, 13)
  })
  // muzzle
  blob(ctx, color, () => {
    ctx.ellipse(-30, -8, 6, 5, 0, 0, Math.PI * 2)
  })
  // ear
  blob(ctx, color, () => {
    ctx.moveTo(-24, -26)
    ctx.lineTo(-18, -34)
    ctx.lineTo(-14, -25)
    ctx.closePath()
  })
  // horn
  blob(ctx, '#ffd93d', () => {
    ctx.moveTo(-22, -27)
    ctx.lineTo(-18, -40)
    ctx.lineTo(-15, -27)
    ctx.closePath()
  })
}

const drawUnicorn: Draw = (ctx, color) => {
  drawUnicornBody(ctx, color)
  dot(ctx, -22, -14, 2)
}

const EYE_CX = -21
const EYE_CY = -15
const EYE_SCLERA_R = 6
const EYE_PUPIL_R = 2.6

// Only used for the studio mascot, not the placeable sticker - a bigger eye
// with a pupil that can shift within it (see components.ts's blob/dot reuse
// so it still gets the same outline treatment as the rest of the body).
// `eyeX`/`eyeY` point toward whatever the mascot should be looking at; the
// pupil is clamped so it never leaves the sclera.
export function drawMascotUnicorn(
  ctx: CanvasRenderingContext2D,
  color: string,
  eyeX: number,
  eyeY: number,
): void {
  drawUnicornBody(ctx, color)

  const maxOffset = EYE_SCLERA_R - EYE_PUPIL_R - 0.5
  const mag = Math.sqrt(eyeX * eyeX + eyeY * eyeY)
  const scale = mag > maxOffset ? maxOffset / mag : 1

  blob(ctx, '#ffffff', () => circlePath(ctx, EYE_CX, EYE_CY, EYE_SCLERA_R))
  dot(ctx, EYE_CX + eyeX * scale, EYE_CY + eyeY * scale, EYE_PUPIL_R)
}

const RAINBOW_BANDS = ['#ff4d4d', '#ff9f43', '#ffd93d', '#6bcb77', '#4dd0e1', '#a26bff']

const drawRainbow: Draw = (ctx) => {
  const bandWidth = 6

  RAINBOW_BANDS.forEach((band, i) => {
    ctx.beginPath()
    ctx.arc(0, 20, 36 - i * bandWidth, Math.PI, Math.PI * 2)
    ctx.lineWidth = bandWidth + (outlineWidth ?? 0) * 2
    ctx.lineCap = outlineWidth !== null ? 'round' : 'butt'
    ctx.strokeStyle = paintOverride ?? band
    ctx.stroke()
  })
}

const drawCloud: Draw = (ctx, color) => {
  blob(ctx, color, () => {
    ctx.moveTo(-28, 14)
    ctx.arc(-20, 10, 12, Math.PI * 0.5, Math.PI * 1.6)
    ctx.arc(-4, -4, 15, Math.PI * 1.1, Math.PI * 2.1)
    ctx.arc(16, 2, 13, Math.PI * 1.5, Math.PI * 0.4)
    ctx.arc(6, 16, 10, Math.PI * -0.1, Math.PI * 0.7)
    ctx.closePath()
  })
}

const drawStar: Draw = (ctx, color) => {
  blob(ctx, color, () => {
    const spikes = 5
    const outerR = 26
    const innerR = 11

    for (let i = 0; i < spikes * 2; i += 1) {
      const r = i % 2 === 0 ? outerR : innerR
      const a = (Math.PI * i) / spikes - Math.PI / 2

      const px = Math.cos(a) * r
      const py = Math.sin(a) * r

      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  })
}

const drawHeart: Draw = (ctx, color) => {
  blob(ctx, color, () => {
    ctx.moveTo(0, 30)
    ctx.bezierCurveTo(-36, 2, -22, -28, 0, -10)
    ctx.bezierCurveTo(22, -28, 36, 2, 0, 30)
  })
}

const drawSun: Draw = (ctx, color) => {
  blob(ctx, color, () => {
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * i) / 4

      ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18)
      ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32)
    }
    circlePath(ctx, 0, 0, 18)
  })
}

const drawMoon: Draw = (ctx, color) => {
  // the "bite" circle must stay fully inside the main circle, or evenodd
  // punches a second hole where it pokes out instead of carving a crescent
  blob(
    ctx,
    color,
    () => {
      circlePath(ctx, 0, 0, 22)
      circlePath(ctx, 5, -4, 15)
    },
    'evenodd',
  )
}

const drawBalloon: Draw = (ctx, color) => {
  blob(ctx, color, () => {
    ctx.ellipse(0, -6, 20, 24, 0, 0, Math.PI * 2)
  })
  blob(ctx, color, () => {
    ctx.moveTo(-5, 18)
    ctx.lineTo(5, 18)
    ctx.lineTo(0, 26)
    ctx.closePath()
  })
  ctx.beginPath()
  ctx.moveTo(0, 26)
  ctx.quadraticCurveTo(10, 34, 0, 44)
  ctx.lineWidth = 2 + (outlineWidth ?? 0) * 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = paintOverride ?? OUTLINE_COLOR
  ctx.stroke()
}

// The 100%-completion bonus piece (see TIERS in progression.ts) - a joke,
// not a themed sticker, since finishing every recipe deserves a laugh.
// Both eyes share one look direction (ex/ey, already clamped to how far a
// pupil can stray from dead-center) rather than each tracking separately -
// a real googly-eye toy's pupils roll together too.
const EYE_PAIR_GAP = 20
const GOOGLY_SCLERA_R = 16
const GOOGLY_PUPIL_R = 7

function drawEyePair(ctx: CanvasRenderingContext2D, ex: number, ey: number): void {
  [-EYE_PAIR_GAP, EYE_PAIR_GAP].forEach((cx) => {
    blob(ctx, '#ffffff', () => circlePath(ctx, cx, 0, GOOGLY_SCLERA_R))
    dot(ctx, cx + ex, ey, GOOGLY_PUPIL_R)
  })
}

// COMPONENTS' own entry - used for the tray icon, Collection/Album
// thumbnails, and hit-testing, none of which have a pointer position to
// track. A fixed, slightly cockeyed look for a bit of default character
// rather than dead-center pupils, which read as inert/broken rather than
// "not tracking yet."
const drawGooglyEyes: Draw = ctx => drawEyePair(ctx, 3, 4)

// the live version - drawn instead of COMPONENTS.googlyEyes for a placed
// sticker on the main canvas (see placeRaw in index.ts), so it actually
// watches the pointer the way the mascot's own eye does. `lookX`/`lookY`
// is the pointer's position relative to this sticker, already rotated
// into its local (unrotated) space by the caller - same shape as
// drawMascotUnicorn's own eyeX/eyeY, just clamped here instead of there.
export function drawGooglyEyesTracking(ctx: CanvasRenderingContext2D, lookX: number, lookY: number): void {
  const maxOffset = GOOGLY_SCLERA_R - GOOGLY_PUPIL_R - 1
  const mag = Math.sqrt(lookX * lookX + lookY * lookY)
  const scale = mag > maxOffset ? maxOffset / mag : 1

  drawEyePair(ctx, lookX * scale, lookY * scale)
}

// Gives a shared, uniform-width border around the combined silhouette of
// whatever `place` draws, instead of a separate stroke per shape/component.
// `place` should draw everything (any number of positioned components) with
// no outer transform applied yet. Every path gets a round-joined stroke on
// top of its fill, both forced to `color` - since fill and stroke are the
// same flat color, internal seams (a white mane against a white body, one
// component overlapping another) stay invisible, while sharp corners round
// off cleanly and the true outer boundary grows by exactly `width`.
// Does not draw `place`'s real colors - pair with a later plain call to
// `place()`, or use drawOutlined below for the common case.
export function stampSilhouette(
  ctx: CanvasRenderingContext2D,
  place: () => void,
  color: string,
  width: number,
): void {
  paintOverride = color
  outlineWidth = width
  place()
  paintOverride = null
  outlineWidth = null
}

// A flat, single-color silhouette with no outline dilation - the title
// screen's background drifters use this for a subtle monochrome
// "watermark," not a real outlined sticker. Reuses the same paintOverride
// mechanism stampSilhouette does, but leaves outlineWidth untouched (null)
// so blob()'s stroke branch never fires - just a plain flat fill.
export function stampFlat(ctx: CanvasRenderingContext2D, place: () => void, color: string): void {
  paintOverride = color
  place()
  paintOverride = null
}

// Gives one placed sticker its own clean, self-contained outline (no seams
// between its own internal parts), then draws it for real on top.
export function drawOutlined(
  ctx: CanvasRenderingContext2D,
  place: () => void,
  width = OUTLINE_WIDTH,
): void {
  stampSilhouette(ctx, place, OUTLINE_COLOR, width)
  place()
}

export const COMPONENTS: Record<ComponentType, Draw> = {
  unicorn: drawUnicorn,
  rainbow: drawRainbow,
  cloud: drawCloud,
  star: drawStar,
  heart: drawHeart,
  sun: drawSun,
  moon: drawMoon,
  balloon: drawBalloon,
  googlyEyes: drawGooglyEyes,
}

export const TRAY_ORDER: ComponentType[] = [
  'unicorn',
  'rainbow',
  'cloud',
  'star',
  'heart',
  'sun',
  'moon',
  'balloon',
  'googlyEyes',
]
