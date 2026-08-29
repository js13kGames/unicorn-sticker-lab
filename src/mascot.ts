import { COMPONENTS, drawOutlined } from './components'
import { DEFAULT_COLOR } from './constants'

const BASE_SCALE = 0.75
const EXCITED_MS = 350

let excitedAt = -Infinity

// Call when something is created (placed/duplicated) for a brief happy bounce.
export function mascotExcited(): void {
  excitedAt = performance.now()
}

// `lean` is -1..1: which way the current selection sits relative to center,
// so the mascot tilts toward whatever you're working on.
export function renderMascot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  lean: number,
): void {
  ctx.clearRect(0, 0, width, height)

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

  drawOutlined(ctx, () => {
    ctx.save()
    // +2 nudges down slightly since the unicorn's own art sits a bit above
    // its local origin (the horn reaches higher than the legs reach down)
    ctx.translate(width / 2, height / 2 + 2 - bounce)
    ctx.rotate(tilt)
    ctx.scale(BASE_SCALE * squash, BASE_SCALE / squash)
    COMPONENTS.unicorn(ctx, DEFAULT_COLOR)
    ctx.restore()
  })
}
