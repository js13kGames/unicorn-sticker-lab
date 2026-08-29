import { OUTLINE_COLOR } from './constants'

const PIECE_COUNT = 8
const FLASH_MS = 90

export const LANDING_BURST_MS = 260

// A tiny one-shot puff at a freshly-placed sticker's own landing spot -
// distinct from confetti.ts's bigger, rainbow, discovery-triggered burst
// (same reasoning as load-bearing decision #10: different triggers answer
// different design questions, don't merge them) and from effects.ts's
// persistent, player-chosen decorations. Single-colored - the sticker's
// own color, not a rainbow - and much smaller/quicker, so it reads as
// "this just arrived," not "you discovered something." Draws in the
// burst's own local space, same convention as confetti.ts/effects.ts -
// the caller translates to the landing spot first.
export function drawLandingBurst(ctx: CanvasRenderingContext2D, elapsed: number, color: string): void {
  const t = Math.min(1, elapsed / LANDING_BURST_MS)
  // holds full brightness for the first third rather than fading from
  // frame one - same "punchy, not weak from the start" reasoning as
  // confetti.ts's own burst
  const alpha = t < 0.33 ? 1 : 1 - (t - 0.33) / 0.67

  // a quick bright flash at the origin, the same idiom confetti.ts uses for
  // its own "pop" - scaled down to fit this burst's much shorter lifetime,
  // since a same-colored puff alone still reads as weak the instant it
  // appears, however dark-outlined each dot is
  if (elapsed < FLASH_MS) {
    const flashT = elapsed / FLASH_MS

    ctx.save()
    ctx.globalAlpha = 1 - flashT
    ctx.fillStyle = '#fff6b0'
    ctx.beginPath()
    ctx.arc(0, 0, 6 + flashT * 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (let i = 0; i < PIECE_COUNT; i += 1) {
    const angle = (i / PIECE_COUNT) * Math.PI * 2
    // a component's own drawn silhouette typically reaches ~40-44 units
    // from center (see HIT_RADIUS's own comment in index.ts) - starting
    // and ending well past that keeps every piece visible against the
    // canvas background the whole time, instead of the same-colored burst
    // disappearing into the same-colored sticker it's celebrating
    const dist = 30 + t * 30
    const px = Math.cos(angle) * dist
    const py = Math.sin(angle) * dist
    const radius = 5.5 - t * 3

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    // a dark outline first, same reasoning as the selection ring's own
    // "dark halo + bright top" - a burst in the sticker's own color has no
    // guaranteed contrast against the canvas background or the sticker
    // itself (a purple sticker on the purple canvas, say), so every dot
    // gets one regardless of what color it actually is. Thicker than
    // before (was 1.5) - still not enough contrast per direct feedback.
    ctx.lineWidth = 2.2
    ctx.strokeStyle = OUTLINE_COLOR
    ctx.stroke()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
}
