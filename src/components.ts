import { OUTLINE_COLOR, OUTLINE_WIDTH } from './constants'
import type { ComponentType } from './types'

type Draw = (ctx: CanvasRenderingContext2D, color: string) => void

// Fills the current path with `fill`, then strokes it with the sticker outline.
function blob(
  ctx: CanvasRenderingContext2D,
  fill: string,
  path: () => void,
  rule: CanvasFillRule = 'nonzero',
): void {
  ctx.beginPath()
  path()
  ctx.fillStyle = fill
  ctx.fill(rule)
  ctx.lineWidth = OUTLINE_WIDTH
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.stroke()
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

const drawUnicorn: Draw = (ctx, color) => {
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
  dot(ctx, -22, -14, 2)
}

const RAINBOW_BANDS = ['#ff4d4d', '#ff9f43', '#ffd93d', '#6bcb77', '#4dd0e1', '#a26bff']

const drawRainbow: Draw = (ctx) => {
  const bandWidth = 6

  RAINBOW_BANDS.forEach((band, i) => {
    ctx.beginPath()
    ctx.arc(0, 20, 36 - i * bandWidth, Math.PI, Math.PI * 2)
    ctx.lineWidth = bandWidth
    ctx.strokeStyle = band
    ctx.stroke()
  })
  ctx.lineWidth = OUTLINE_WIDTH / 2
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.beginPath()
  ctx.arc(0, 20, 36, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 20, 36 - bandWidth * RAINBOW_BANDS.length, Math.PI, Math.PI * 2)
  ctx.stroke()
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
  ctx.lineWidth = 2
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.stroke()
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
]
