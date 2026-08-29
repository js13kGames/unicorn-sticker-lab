import './styles/game.css'
import {
  COMPONENTS, TRAY_ORDER, stampSilhouette, drawOutlined,
} from './components'
import {
  playPlace, playDelete, playClick, playDrop,
} from './audio'
import { renderMascot, mascotExcited } from './mascot'
import { EFFECT_ORDER, isBehindEffect, drawEffect } from './effects'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BG,
  PALETTE,
  DEFAULT_COLOR,
  SELECT_COLOR,
  SHARED_OUTLINE_COLOR,
  SHARED_OUTLINE_WIDTH,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
} from './constants'
import type { ComponentType, Placed, EffectType } from './types'

const EFFECT_LABEL: Record<EffectType, string> = {
  none: '&#8856;',
  sparkle: '&#10022;',
  glow: '&#9673;',
  hearts: '&#9829;',
}

const canvas = document.getElementById('c') as HTMLCanvasElement

canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const MASCOT_SIZE = 96
const mascotCanvas = document.getElementById('mascot') as HTMLCanvasElement

mascotCanvas.width = MASCOT_SIZE
mascotCanvas.height = MASCOT_SIZE
const mascotCtx = mascotCanvas.getContext('2d') as CanvasRenderingContext2D

const trayEl = document.getElementById('tray') as HTMLDivElement
const colorsEl = document.getElementById('colors') as HTMLDivElement
const effectsEl = document.getElementById('effects') as HTMLDivElement
const toolbarEl = document.getElementById('toolbar') as HTMLDivElement

// Must be big enough to enclose every component's actual rendered pixels,
// not just its raw path geometry: the farthest points (balloon string tip,
// unicorn horn, rainbow ends) sit ~41-44 units out on their own, and the
// shared white outline and each component's own outline both dilate that
// further outward on top (up to ~12 more at this width) - comfortable
// margin beyond that combined worst case, rather than a tight fit.
const HIT_RADIUS = 64
const MIN_SCALE = 0.4
const MAX_SCALE = 2.5

let stickers: Placed[] = []
let nextId = 1
let selectedId: number | null = null
let currentColor = DEFAULT_COLOR
let dragOffset: { x: number; y: number } | null = null

function selected(): Placed | undefined {
  return stickers.find(s => s.id === selectedId)
}

function placeRaw(p: Placed): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.scale(p.flip ? -p.scale : p.scale, p.scale)
  COMPONENTS[p.type](ctx, p.color)
  ctx.restore()
}

// each sticker gets its own clean self-contained black outline, at a
// constant screen width regardless of that sticker's own scale (same
// reasoning as the shared margin below)
function drawPlaced(p: Placed): void {
  drawOutlined(ctx, () => placeRaw(p), OUTLINE_WIDTH / p.scale)
}

// effects draw in the sticker's own local space so they move/scale with it,
// but outside placeRaw - they're not part of the sticker's own silhouette
// (glow/sparkle shouldn't be forced into the flat outline colors, or get
// stroked as if they were solid sticker shapes)
function placeEffect(p: Placed, now: number): void {
  if (p.effect === 'none') return

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.scale(p.scale, p.scale)
  drawEffect(ctx, p.effect, now)
  ctx.restore()
}

function render(now: number): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  stickers.forEach((p) => {
    if (isBehindEffect(p.effect)) placeEffect(p, now)
  })

  // a thick white margin around the whole combined silhouette first, so
  // layered stickers read as one sticker, then each piece drawn on top
  // with its own individual outline. lineWidth is set inside each sticker's
  // own scale transform, so it has to be divided by that sticker's scale
  // here or the margin would get thicker/thinner as stickers are resized -
  // called once per sticker rather than once for the whole array so each
  // can use its own scale, but same-color overlapping fills still merge
  // seamlessly into one shared margin regardless of that grouping
  stickers.forEach((p) => {
    stampSilhouette(ctx, () => placeRaw(p), SHARED_OUTLINE_COLOR, SHARED_OUTLINE_WIDTH / p.scale)
  })
  stickers.forEach(drawPlaced)

  stickers.forEach((p) => {
    if (p.effect !== 'none' && !isBehindEffect(p.effect)) placeEffect(p, now)
  })

  const sel = selected()

  if (sel) {
    ctx.save()
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.arc(sel.x, sel.y, HIT_RADIUS * sel.scale, 0, Math.PI * 2)

    // dark halo first, then the bright dashes on top - stays visible
    // against light or dark backgrounds instead of just one of them
    ctx.lineWidth = 4
    ctx.strokeStyle = OUTLINE_COLOR
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = SELECT_COLOR
    ctx.stroke()
    ctx.restore()
  }

  toolbarEl.classList.toggle('active', !!sel)
  effectsEl.classList.toggle('active', !!sel)

  // reflect the selected sticker's own color/effect, not just whatever was
  // last clicked - otherwise switching between stickers with different
  // colors/effects leaves the old selection's buttons highlighted
  const activeColor = sel ? sel.color : currentColor

  colorsEl.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.color === activeColor)
  })

  const activeEffect = sel ? sel.effect : 'none'

  effectsEl.querySelectorAll('.effect-btn').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.effect === activeEffect)
  })
}

function pointerPos(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()

  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  }
}

function withinRadius(s: Placed, x: number, y: number): boolean {
  const dx = x - s.x
  const dy = y - s.y

  return Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS * s.scale
}

// Off-DOM canvas used only to test whether a specific sticker's own drawn
// pixels (not its loose bounding circle) cover a given point.
const hitCanvas = document.createElement('canvas')

hitCanvas.width = CANVAS_WIDTH
hitCanvas.height = CANVAS_HEIGHT
const hitCtx = hitCanvas.getContext('2d') as CanvasRenderingContext2D

function coversPixel(s: Placed, x: number, y: number): boolean {
  hitCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  hitCtx.save()
  hitCtx.translate(s.x, s.y)
  hitCtx.rotate(s.rotation)
  hitCtx.scale(s.flip ? -s.scale : s.scale, s.scale)
  COMPONENTS[s.type](hitCtx, s.color)
  hitCtx.restore()

  return hitCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] > 0
}

// Picking a *new* sticker only counts a click on its actual visible pixels -
// the loose bounding circle is reserved for keeping the already-selected
// sticker grabbable (see pointerdown below), not for first selecting one.
function hitTest(x: number, y: number): Placed | undefined {
  for (let i = stickers.length - 1; i >= 0; i -= 1) {
    if (coversPixel(stickers[i], x, y)) return stickers[i]
  }

  return undefined
}

canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = pointerPos(e)
  const sel = selected()
  // the selection ring is drawn above every other sticker, so clicking
  // inside it should keep grabbing the already-selected sticker even when
  // a different one is stacked on top there - otherwise the ring would be
  // lying about what you can click
  const hit = sel && withinRadius(sel, x, y) ? sel : hitTest(x, y)

  if (hit) {
    selectedId = hit.id
    dragOffset = { x: x - hit.x, y: y - hit.y }
    canvas.setPointerCapture(e.pointerId)
  } else {
    selectedId = null
  }
})

canvas.addEventListener('pointermove', (e) => {
  if (!dragOffset) return

  const sel = selected()

  if (!sel) return

  const { x, y } = pointerPos(e)

  sel.x = Math.min(CANVAS_WIDTH, Math.max(0, x - dragOffset.x))
  sel.y = Math.min(CANVAS_HEIGHT, Math.max(0, y - dragOffset.y))
})

canvas.addEventListener('pointerup', () => {
  if (dragOffset) playDrop()
  dragOffset = null
})

function addSticker(type: ComponentType): void {
  const p: Placed = {
    id: nextId,
    type,
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    scale: 1,
    rotation: 0,
    color: currentColor,
    flip: false,
    effect: 'none',
  }

  nextId += 1
  stickers.push(p)
  selectedId = p.id
  playPlace()
  mascotExcited()
}

TRAY_ORDER.forEach((type) => {
  const btn = document.createElement('button')
  const icon = document.createElement('canvas')

  icon.width = 48
  icon.height = 48
  btn.className = 'tray-btn'
  btn.title = type
  btn.appendChild(icon)

  const iconCtx = icon.getContext('2d') as CanvasRenderingContext2D

  iconCtx.translate(24, 26)
  drawOutlined(
    iconCtx,
    () => {
      iconCtx.save()
      iconCtx.scale(0.42, 0.42)
      COMPONENTS[type](iconCtx, DEFAULT_COLOR)
      iconCtx.restore()
    },
    3,
  )

  btn.addEventListener('click', () => addSticker(type))
  trayEl.appendChild(btn)
})

PALETTE.forEach((color) => {
  const btn = document.createElement('button')

  btn.className = 'swatch'
  btn.style.background = color
  btn.title = color
  btn.dataset.color = color

  btn.addEventListener('click', () => {
    currentColor = color
    playClick()

    const sel = selected()

    if (sel) sel.color = color
  })
  colorsEl.appendChild(btn)
})

EFFECT_ORDER.forEach((effect) => {
  const btn = document.createElement('button')

  btn.className = 'effect-btn'
  btn.title = effect
  btn.innerHTML = EFFECT_LABEL[effect]
  btn.dataset.effect = effect

  btn.addEventListener('click', () => {
    playClick()

    const sel = selected()

    if (sel) sel.effect = effect
  })
  effectsEl.appendChild(btn)
})

const ROTATE_STEP = Math.PI / 12
const SCALE_STEP = 0.1

toolbarEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const act = target.closest('button')?.dataset.act
  const sel = selected()

  if (!act || !sel) return

  if (act === 'rotL') sel.rotation -= ROTATE_STEP
  if (act === 'rotR') sel.rotation += ROTATE_STEP
  if (act === 'scaleUp') sel.scale = Math.min(MAX_SCALE, sel.scale + SCALE_STEP)
  if (act === 'scaleDown') sel.scale = Math.max(MIN_SCALE, sel.scale - SCALE_STEP)
  if (act === 'flip') sel.flip = !sel.flip

  if (act === 'front' || act === 'back') {
    const i = stickers.indexOf(sel)
    const j = act === 'front' ? i + 1 : i - 1

    if (j >= 0 && j < stickers.length) {
      stickers[i] = stickers[j]
      stickers[j] = sel
    }
  }
  if (act === 'dup') {
    const clone: Placed = { ...sel, id: nextId, x: sel.x + 12, y: sel.y + 12 }

    nextId += 1
    stickers.push(clone)
    selectedId = clone.id
  }
  if (act === 'del') {
    stickers = stickers.filter(s => s.id !== sel.id)
    selectedId = null
  }

  if (act === 'del') {
    playDelete()
  } else if (act === 'dup') {
    playPlace()
    mascotExcited()
  } else {
    playClick()
  }
})

window.addEventListener('keydown', (e) => {
  const sel = selected()

  if (!sel) return

  const nudge = 6

  if (e.key === 'Delete' || e.key === 'Backspace') {
    stickers = stickers.filter(s => s.id !== sel.id)
    selectedId = null
    playDelete()
  }
  if (e.key === 'ArrowLeft') sel.x -= nudge
  if (e.key === 'ArrowRight') sel.x += nudge
  if (e.key === 'ArrowUp') sel.y -= nudge
  if (e.key === 'ArrowDown') sel.y += nudge
})

// stickers render continuously (not just on state changes) since effects
// (sparkle/glow/hearts) animate on their own even when nothing else does
function loop(now: number): void {
  render(now)
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)

// tracked globally (not just over the mascot canvas) so the eyes keep
// following the cursor anywhere on the page, not only while over the mascot
let pointerScreenX = 0
let pointerScreenY = 0

window.addEventListener('pointermove', (e) => {
  pointerScreenX = e.clientX
  pointerScreenY = e.clientY
})

// the mascot idles continuously even when nothing else changes, so it gets
// its own animation loop instead of only redrawing on state changes
function mascotLoop(now: number): void {
  const sel = selected()
  const lean = sel ? Math.max(-1, Math.min(1, (sel.x - CANVAS_WIDTH / 2) / (CANVAS_WIDTH / 2))) : 0
  const mascotRect = mascotCanvas.getBoundingClientRect()
  const lookX = pointerScreenX - (mascotRect.left + mascotRect.width / 2)
  const lookY = pointerScreenY - (mascotRect.top + mascotRect.height / 2)

  renderMascot(mascotCtx, MASCOT_SIZE, MASCOT_SIZE, now, lean, lookX, lookY)
  requestAnimationFrame(mascotLoop)
}

requestAnimationFrame(mascotLoop)
