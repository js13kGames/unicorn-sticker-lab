import { COMPONENTS, drawMascotUnicorn, drawOutlined } from './components'
import { DEFAULT_COLOR } from './constants'

const BASE_SCALE = 0.75
const EXCITED_MS = 350
const EYE_REACH = 4.5

// a quick blink every few seconds - purely a function of `now` (no extra
// scheduling state, unlike the poop's randomized timer below) since a
// perfectly regular blink still reads as "alive" for something this
// small and is far cheaper than giving it its own random schedule too
const BLINK_PERIOD_MS = 4000
const BLINK_MS = 140

const POOP_DURATION_MS = 1100
const POOP_MIN_DELAY_MS = 15000
const POOP_MAX_DELAY_MS = 30000

let excitedAt = -Infinity
let poopAt = -Infinity
let nextPoopAt = -Infinity

// Call when something is created (placed/duplicated) for a brief happy bounce.
export function mascotExcited(): void {
  excitedAt = performance.now()
}

function scheduleNextPoop(now: number): number {
  return now + POOP_MIN_DELAY_MS + Math.random() * (POOP_MAX_DELAY_MS - POOP_MIN_DELAY_MS)
}

// A tiny rainbow that pops in behind the mascot and fades out - just a
// silly surprise, not tied to anything else, so it draws independently of
// the mascot's own tilt/squash (only sharing its vertical bounce).
function drawPoop(ctx: CanvasRenderingContext2D, width: number, height: number, bounce: number, t: number): void {
  const growT = Math.min(1, t / 0.25)
  const scale = Math.sin((growT * Math.PI) / 2)
  const fadeStart = 0.65
  const alpha = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart))

  ctx.save()
  ctx.globalAlpha = alpha
  drawOutlined(ctx, () => {
    ctx.save()
    ctx.translate(width / 2 + 24, height / 2 + 22 - bounce * 0.4)
    ctx.scale(0.4 * scale, 0.4 * scale)
    COMPONENTS.rainbow(ctx, '')
    ctx.restore()
  }, 3)
  ctx.restore()
}

// `lean` is -1..1: which way the current selection sits relative to center,
// so the mascot tilts toward whatever you're working on. `lookX`/`lookY` is
// a raw (unnormalized) direction toward the pointer - only its direction is
// used, so the eyes always fully commit toward wherever the cursor is.
export function renderMascot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  lean: number,
  lookX: number,
  lookY: number,
): void {
  ctx.clearRect(0, 0, width, height)

  if (nextPoopAt === -Infinity) nextPoopAt = scheduleNextPoop(now)
  if (now >= nextPoopAt) {
    poopAt = now
    nextPoopAt = scheduleNextPoop(now)
  }

  const idlePhase = now / 450
  // fades linearly from 1 (just triggered) to 0 (EXCITED_MS later), instead
  // of a boolean cutoff - the excited wobble below is added on top of the
  // idle motion and dies out to exactly 0 at the same rate, so there's
  // never an instant where the two formulas visibly disagree
  const excitement = Math.max(0, 1 - (now - excitedAt) / EXCITED_MS)
  const bounce = Math.sin(idlePhase) * 2.5 + excitement * Math.abs(Math.sin(now / 45)) * 6
  const squash = 1 + excitement * Math.sin(now / 45) * 0.08
  const sway = Math.sin(idlePhase * 0.7) * 0.06
  const tilt = sway + lean * 0.25

  const lookMag = Math.hypot(lookX, lookY) || 1
  const eyeX = (lookX / lookMag) * EYE_REACH
  const eyeY = (lookY / lookMag) * EYE_REACH

  const blinkPhase = now % BLINK_PERIOD_MS
  const blink = blinkPhase < BLINK_MS ? Math.sin((blinkPhase / BLINK_MS) * Math.PI) : 0

  const poopT = (now - poopAt) / POOP_DURATION_MS

  if (poopT >= 0 && poopT < 1) drawPoop(ctx, width, height, bounce, poopT)

  drawOutlined(ctx, () => {
    ctx.save()
    // +2 nudges down slightly since the unicorn's own art sits a bit above
    // its local origin (the horn reaches higher than the legs reach down)
    ctx.translate(width / 2, height / 2 + 2 - bounce)
    ctx.rotate(tilt)
    ctx.scale(BASE_SCALE * squash, BASE_SCALE / squash)
    drawMascotUnicorn(ctx, DEFAULT_COLOR, eyeX, eyeY, blink)
    ctx.restore()
  })
}
