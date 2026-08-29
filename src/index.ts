import './styles/game.css'
import {
  COMPONENTS, TRAY_ORDER, stampSilhouette, drawOutlined,
} from './components'
import {
  playPlace, playDelete, playClick, playDrop, playDiscovery,
} from './audio'
import { renderMascot, mascotExcited } from './mascot'
import { EFFECT_ORDER, isBehindEffect, drawEffect } from './effects'
import { RECIPES, findMatch } from './recipes'
import { clusterByOverlap } from './cluster'
import { drawConfettiBurst, BURST_DURATION_MS } from './confetti'
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
const discoveryCountEl = document.getElementById('discoveryCount') as HTMLSpanElement
const toastEl = document.getElementById('toast') as HTMLDivElement
const collectionBtn = document.getElementById('collectionBtn') as HTMLButtonElement
const collectionEl = document.getElementById('collection') as HTMLDivElement
const collectionCloseBtn = document.getElementById('collectionClose') as HTMLButtonElement
const collectionListEl = document.getElementById('collectionList') as HTMLDivElement
const printBtn = document.getElementById('printBtn') as HTMLButtonElement

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
let nextGroupId = 1
let selectedId: number | null = null
let currentColor = DEFAULT_COLOR
let dragOffset: { x: number; y: number } | null = null
const discoveredIds = new Set<string>()
let toastTimer: number | undefined

// the toast says *what* was discovered but not *where* - a burst pinpoints
// it, especially useful when several stickers are on the canvas at once.
// An array, not a single slot: printing can turn up more than one new
// discovery at a time if you built several valid clusters before printing.
interface Burst { x: number; y: number; at: number }
let discoveryBursts: Burst[] = []

const PRINT_FLOURISH_MS = 500

// a brief rise-then-settle applied only visually (not to the sticker's real
// x/y, so hit-testing and dragging are unaffected) right after printing
function printFlourish(p: Placed, now: number): number {
  if (p.printedAt === null) return 0

  const t = now - p.printedAt

  if (t < 0 || t > PRINT_FLOURISH_MS) return 0

  return -Math.sin((t / PRINT_FLOURISH_MS) * Math.PI) * 14
}

function selected(): Placed | undefined {
  return stickers.find(s => s.id === selectedId)
}

function showToast(text: string): void {
  toastEl.textContent = text
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200)
}

function renderCollectionList(): void {
  collectionListEl.innerHTML = ''
  RECIPES.forEach((r) => {
    const found = discoveredIds.has(r.id)
    const row = document.createElement('div')

    row.className = found ? 'discovery-row found' : 'discovery-row'
    row.textContent = found ? r.name : '???'
    if (!found) row.title = r.hint
    collectionListEl.appendChild(row)
  })
}

function updateDiscoveryCount(): void {
  discoveryCountEl.textContent = `✦ ${discoveredIds.size}/${RECIPES.length}`
}

// The manual "did I make something?" check (like Little Inferno's burn
// trigger), not a continuous one - an earlier version checked every frame,
// but that meant discoveries fired passively just from having ingredients
// anywhere on the canvas, with no reward for actually composing them
// together. Printing clusters the *unprinted* stickers by overlap (already-
// printed ones are final - see the `editable` comment above - so they never
// re-enter clustering at all: two printed stickers can't merge just because
// they happen to overlap, and neither can a loose piece overlapping one)
// and resolves each cluster on its own:
//   - a cluster of 2+ whose exact set of types matches a recipe: becomes
//     one grouped sticker, full fanfare if it's newly discovered, a
//     smaller one if already known
//   - a cluster of 2+ that matches nothing: still becomes one grouped
//     sticker (a valid custom creation, no fanfare) - failure never just
//     deletes your work
//   - an isolated single with nothing unprinted overlapping it: removed
function handlePrint(): void {
  if (stickers.length === 0) return

  const now = performance.now()
  const clusters = clusterByOverlap(stickers.filter(s => s.groupId === null))
  const sweptIds = new Set<number>()
  let anySwept = false
  let anyNew = false
  let anyKnown = false
  let anyCustom = false

  clusters.forEach((cluster) => {
    if (cluster.length === 1) {
      sweptIds.add(cluster[0].id)
      anySwept = true

      return
    }

    const groupId = nextGroupId

    nextGroupId += 1
    cluster.forEach((s) => {
      s.groupId = groupId
      s.printedAt = now
    })

    const presentTypes = new Set(cluster.map(s => s.type))
    const match = findMatch(presentTypes)

    if (!match) {
      anyCustom = true

      return
    }

    if (discoveredIds.has(match.id)) {
      anyKnown = true
      showToast(match.name)
    } else {
      discoveredIds.add(match.id)
      anyNew = true
      showToast(`✦ ${match.name}!`)
      discoveryBursts.push({
        x: cluster.reduce((sum, s) => sum + s.x, 0) / cluster.length,
        y: cluster.reduce((sum, s) => sum + s.y, 0) / cluster.length,
        at: now,
      })
    }
  })

  // groups are formed in place above (mutating groupId/printedAt), so the
  // only structural change needed is dropping the swept singles - already-
  // printed stickers were never touched and keep their original position
  stickers = stickers.filter(s => !sweptIds.has(s.id))
  selectedId = null

  if (anyNew) {
    playDiscovery()
    mascotExcited()
  } else if (anyKnown) {
    playPlace()
    mascotExcited()
  } else if (anyCustom) {
    playDrop()
  }
  if (anySwept) playDelete()

  if (anyNew) {
    updateDiscoveryCount()
    renderCollectionList()
  }
}

function placeRaw(p: Placed, now: number): void {
  ctx.save()
  ctx.translate(p.x, p.y + printFlourish(p, now))
  ctx.rotate(p.rotation)
  ctx.scale(p.flip ? -p.scale : p.scale, p.scale)
  COMPONENTS[p.type](ctx, p.color)
  ctx.restore()
}

// each sticker gets its own clean self-contained black outline, at a
// constant screen width regardless of that sticker's own scale (same
// reasoning as the shared margin below)
function drawPlaced(p: Placed, now: number): void {
  drawOutlined(ctx, () => placeRaw(p, now), OUTLINE_WIDTH / p.scale)
}

// effects draw in the sticker's own local space so they move/scale with it,
// but outside placeRaw - they're not part of the sticker's own silhouette
// (glow/sparkle shouldn't be forced into the flat outline colors, or get
// stroked as if they were solid sticker shapes)
function placeEffect(p: Placed, now: number): void {
  if (p.effect === 'none') return

  ctx.save()
  ctx.translate(p.x, p.y + printFlourish(p, now))
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
    stampSilhouette(ctx, () => placeRaw(p, now), SHARED_OUTLINE_COLOR, SHARED_OUTLINE_WIDTH / p.scale)
  })
  stickers.forEach(p => drawPlaced(p, now))

  stickers.forEach((p) => {
    if (p.effect !== 'none' && !isBehindEffect(p.effect)) placeEffect(p, now)
  })

  discoveryBursts = discoveryBursts.filter(b => now - b.at < BURST_DURATION_MS)
  discoveryBursts.forEach((b) => {
    ctx.save()
    ctx.translate(b.x, b.y)
    drawConfettiBurst(ctx, now - b.at)
    ctx.restore()
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

  // printing is meant to be final - a printed sticker can still be moved
  // or deleted as a whole (see pointermove/keydown/toolbar 'del' below),
  // but not edited piece by piece. Want it editable? Don't print it yet.
  // Printed and want something different? Rebuild, don't reach back in.
  // The toolbar itself only cares whether *anything* is selected (delete
  // needs to stay reachable even on a printed group); the finer edit/no-edit
  // line is drawn per-button below via the .edit-only buttons' disabled state.
  const editable = !!sel && sel.groupId === null

  toolbarEl.classList.toggle('active', !!sel)
  toolbarEl.querySelectorAll('.edit-only').forEach((el) => {
    (el as HTMLButtonElement).disabled = !editable
  })
  effectsEl.classList.toggle('active', editable)

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
  const targetX = Math.min(CANVAS_WIDTH, Math.max(0, x - dragOffset.x))
  const targetY = Math.min(CANVAS_HEIGHT, Math.max(0, y - dragOffset.y))

  if (sel.groupId === null) {
    sel.x = targetX
    sel.y = targetY
  } else {
    // printed stickers move together as one unit - only the dragged one is
    // clamped to the canvas edge, the rest just carry the same delta, so
    // the group doesn't visually break apart if one member hits a wall
    const dx = targetX - sel.x
    const dy = targetY - sel.y

    stickers.forEach((s) => {
      if (s.groupId === sel.groupId) {
        s.x += dx
        s.y += dy
      }
    })
  }
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
    groupId: null,
    printedAt: null,
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

    // printed stickers aren't editable - see the `editable` comment in
    // render(). currentColor still updates above, for whatever's placed next
    if (sel && sel.groupId === null) sel.color = color
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

    if (sel && sel.groupId === null) sel.effect = effect
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
  // the .edit-only buttons already disable themselves for a printed
  // selection, but guard the logic too rather than relying only on that
  if (act !== 'del' && sel.groupId !== null) return

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
    // a duplicate starts as its own fresh, ungrouped sticker rather than
    // silently joining whatever group the original was printed into
    const clone: Placed = {
      ...sel, id: nextId, x: sel.x + 12, y: sel.y + 12, groupId: null, printedAt: null,
    }

    nextId += 1
    stickers.push(clone)
    selectedId = clone.id
  }
  if (act === 'del') {
    // deleting one member of a printed group removes the whole group -
    // it's one sticker now
    stickers = stickers.filter(s => (sel.groupId === null ? s.id !== sel.id : s.groupId !== sel.groupId))
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
    stickers = stickers.filter(s => (sel.groupId === null ? s.id !== sel.id : s.groupId !== sel.groupId))
    selectedId = null
    playDelete()

    return
  }

  let dx = 0
  let dy = 0

  if (e.key === 'ArrowLeft') dx = -nudge
  if (e.key === 'ArrowRight') dx = nudge
  if (e.key === 'ArrowUp') dy = -nudge
  if (e.key === 'ArrowDown') dy = nudge
  if (dx === 0 && dy === 0) return

  if (sel.groupId === null) {
    sel.x += dx
    sel.y += dy
  } else {
    stickers.forEach((s) => {
      if (s.groupId === sel.groupId) {
        s.x += dx
        s.y += dy
      }
    })
  }
})

collectionBtn.addEventListener('click', () => {
  playClick()
  renderCollectionList()
  collectionEl.classList.remove('hidden')
})

collectionCloseBtn.addEventListener('click', () => {
  playClick()
  collectionEl.classList.add('hidden')
})

printBtn.addEventListener('click', handlePrint)

updateDiscoveryCount()
renderCollectionList()

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
