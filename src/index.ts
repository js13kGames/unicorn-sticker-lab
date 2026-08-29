import './styles/game.css'
import { COMPONENTS, TRAY_ORDER } from './components'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PALETTE,
  DEFAULT_COLOR,
  SELECT_COLOR,
} from './constants'
import type { ComponentType, Placed } from './types'

const canvas = document.getElementById('c') as HTMLCanvasElement

canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const trayEl = document.getElementById('tray') as HTMLDivElement
const colorsEl = document.getElementById('colors') as HTMLDivElement
const toolbarEl = document.getElementById('toolbar') as HTMLDivElement

const HIT_RADIUS = 40
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

function drawPlaced(p: Placed): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.scale(p.flip ? -p.scale : p.scale, p.scale)
  COMPONENTS[p.type](ctx, p.color)
  ctx.restore()
}

function render(): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.fillStyle = '#fdf6ff'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  stickers.forEach(drawPlaced)

  const sel = selected()

  if (sel) {
    ctx.save()
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 2
    ctx.strokeStyle = SELECT_COLOR
    ctx.beginPath()
    ctx.arc(sel.x, sel.y, HIT_RADIUS * sel.scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  toolbarEl.classList.toggle('active', !!sel)
}

function pointerPos(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()

  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  }
}

function hitTest(x: number, y: number): Placed | undefined {
  for (let i = stickers.length - 1; i >= 0; i -= 1) {
    const s = stickers[i]
    const dx = x - s.x
    const dy = y - s.y

    if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS * s.scale) return s
  }

  return undefined
}

canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = pointerPos(e)
  const hit = hitTest(x, y)

  if (hit) {
    selectedId = hit.id
    dragOffset = { x: x - hit.x, y: y - hit.y }
    canvas.setPointerCapture(e.pointerId)
  } else {
    selectedId = null
  }
  render()
})

canvas.addEventListener('pointermove', (e) => {
  if (!dragOffset) return

  const sel = selected()

  if (!sel) return

  const { x, y } = pointerPos(e)

  sel.x = Math.min(CANVAS_WIDTH, Math.max(0, x - dragOffset.x))
  sel.y = Math.min(CANVAS_HEIGHT, Math.max(0, y - dragOffset.y))
  render()
})

canvas.addEventListener('pointerup', () => {
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
  }

  nextId += 1
  stickers.push(p)
  selectedId = p.id
  render()
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
  iconCtx.scale(0.42, 0.42)
  COMPONENTS[type](iconCtx, DEFAULT_COLOR)

  btn.addEventListener('click', () => addSticker(type))
  trayEl.appendChild(btn)
})

PALETTE.forEach((color) => {
  const btn = document.createElement('button')

  btn.className = 'swatch'
  btn.style.background = color
  btn.title = color

  btn.addEventListener('click', () => {
    currentColor = color
    colorsEl.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'))
    btn.classList.add('active')

    const sel = selected()

    if (sel) {
      sel.color = color
      render()
    }
  })
  colorsEl.appendChild(btn)
});
(colorsEl.firstElementChild as HTMLElement)?.classList.add('active')

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

  if (act === 'front') {
    stickers = stickers.filter(s => s.id !== sel.id)
    stickers.push(sel)
  }
  if (act === 'back') {
    stickers = stickers.filter(s => s.id !== sel.id)
    stickers.unshift(sel)
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

  render()
})

window.addEventListener('keydown', (e) => {
  const sel = selected()

  if (!sel) return

  const nudge = 6

  if (e.key === 'Delete' || e.key === 'Backspace') {
    stickers = stickers.filter(s => s.id !== sel.id)
    selectedId = null
  }
  if (e.key === 'ArrowLeft') sel.x -= nudge
  if (e.key === 'ArrowRight') sel.x += nudge
  if (e.key === 'ArrowUp') sel.y -= nudge
  if (e.key === 'ArrowDown') sel.y += nudge

  render()
})

render()
