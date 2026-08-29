const COLORS = ['#ff6b9d', '#ffd93d', '#6bcb77', '#4dd0e1', '#4d7cff', '#a26bff']
const PIECE_COUNT = 18
const FLASH_MS = 200

export const BURST_DURATION_MS = 900

// A one-shot burst celebrating a *new* discovery specifically, at the exact
// spot it happened - separate from the persistent, player-chosen sticker
// effects in effects.ts, since this isn't a decoration you toggle, it's a
// moment. `elapsed` is ms since the burst was triggered; draws in the
// burst's own local space (the caller translates to the discovery's
// position first, same convention as the sticker effects).
export function drawConfettiBurst(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const t = Math.min(1, elapsed / BURST_DURATION_MS)
  // holds full brightness through the first half, then fades - a burst
  // that's already dimming at t=0 reads as weak, not punchy
  const alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5

  // a quick bright flash at the origin, gone within FLASH_MS - the "pop"
  // before the pieces take over as the main visual
  if (elapsed < FLASH_MS) {
    const flashT = elapsed / FLASH_MS

    ctx.save()
    ctx.globalAlpha = 1 - flashT
    ctx.fillStyle = '#fff6b0'
    ctx.beginPath()
    ctx.arc(0, 0, 10 + flashT * 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (let i = 0; i < PIECE_COUNT; i += 1) {
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + (i % 3) * 0.4
    const speed = 75 + (i % 5) * 24
    const dist = speed * t
    const px = Math.cos(angle) * dist
    const py = Math.sin(angle) * dist + 70 * t * t // gravity pulls the arc down over time
    const spin = t * 10 + i * 1.3

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(px, py)
    ctx.rotate(spin)
    ctx.fillStyle = COLORS[i % COLORS.length]
    ctx.fillRect(-5, -3.5, 10, 7)
    ctx.restore()
  }
}
