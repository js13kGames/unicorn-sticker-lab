const PIECE_COUNT = 8

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
  const alpha = 1 - t

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

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, py, 3 - t * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
