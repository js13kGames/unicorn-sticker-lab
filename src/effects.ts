import { COMPONENTS } from './components'
import type { EffectType } from './types'

export const EFFECT_ORDER: EffectType[] = ['none', 'sparkle', 'glow', 'hearts']

// glow has to be drawn behind the sticker (a halo peeking out from around
// it) - the others read better drawn on top instead.
const BEHIND: Record<EffectType, boolean> = {
  none: false,
  sparkle: false,
  glow: true,
  hearts: false,
}

export function isBehindEffect(effect: EffectType): boolean {
  return BEHIND[effect]
}

const SPARKLE_POSITIONS = [
  { x: 42, y: -30, phase: 0 },
  { x: -46, y: 20, phase: 1.3 },
  { x: 30, y: 42, phase: 2.6 },
]

function drawSparkle(ctx: CanvasRenderingContext2D, now: number): void {
  SPARKLE_POSITIONS.forEach((p) => {
    const twinkle = (Math.sin(now / 260 + p.phase) + 1) / 2 // 0..1
    const s = 3 + twinkle * 4

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.globalAlpha = 0.4 + twinkle * 0.6
    ctx.fillStyle = '#fff6b0'
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.28, -s * 0.28)
    ctx.lineTo(s, 0)
    ctx.lineTo(s * 0.28, s * 0.28)
    ctx.lineTo(0, s)
    ctx.lineTo(-s * 0.28, s * 0.28)
    ctx.lineTo(-s, 0)
    ctx.lineTo(-s * 0.28, -s * 0.28)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  })
}

function drawGlow(ctx: CanvasRenderingContext2D, now: number): void {
  const pulse = (Math.sin(now / 500) + 1) / 2
  const r = 45 + pulse * 8
  const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, r)

  gradient.addColorStop(0, `rgba(255, 240, 160, ${0.35 + pulse * 0.15})`)
  gradient.addColorStop(1, 'rgba(255, 240, 160, 0)')

  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const HEART_COUNT = 3
const HEART_LOOP_MS = 2600

function drawHearts(ctx: CanvasRenderingContext2D, now: number): void {
  for (let i = 0; i < HEART_COUNT; i += 1) {
    const offset = (i / HEART_COUNT) * HEART_LOOP_MS
    const t = ((now + offset) % HEART_LOOP_MS) / HEART_LOOP_MS // 0..1, looping
    const x = -20 + i * 20 + Math.sin(t * Math.PI * 2 + i) * 6
    const y = 40 - t * 90
    const alpha = Math.sin(t * Math.PI) // fades in, then out, over the loop

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(0.28, 0.28)
    ctx.globalAlpha = alpha * 0.85
    COMPONENTS.heart(ctx, '#ff6b9d')
    ctx.restore()
  }
}

// Draws in the sticker's own local space (called after that sticker's own
// translate/rotate/scale), so it moves and resizes with the sticker.
export function drawEffect(ctx: CanvasRenderingContext2D, effect: EffectType, now: number): void {
  if (effect === 'sparkle') drawSparkle(ctx, now)
  if (effect === 'glow') drawGlow(ctx, now)
  if (effect === 'hearts') drawHearts(ctx, now)
}
