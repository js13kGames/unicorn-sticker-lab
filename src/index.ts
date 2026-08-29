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
import { clusterByOverlap, circlesTouch } from './cluster'
import { drawConfettiBurst, BURST_DURATION_MS } from './confetti'
import { drawLandingBurst, LANDING_BURST_MS } from './landingBurst'
import { unlockedTypes, nextTier } from './progression'
import { saveGame, loadGame } from './save'
import { pickRequest } from './requests'
import { addToAlbum, renderSnapshot } from './album'
import type { Snapshot } from './album'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BG,
  PALETTE,
  DEFAULT_COLOR,
  SELECT_COLOR,
  SHARED_OUTLINE_COLOR,
  SHARED_OUTLINE_WIDTH,
  PRINTED_OUTLINE_WIDTH,
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

const titleEl = document.getElementById('title') as HTMLDivElement
const titleCanvas = document.getElementById('titleCanvas') as HTMLCanvasElement
const titleCtx = titleCanvas.getContext('2d') as CanvasRenderingContext2D
const startBtn = document.getElementById('startBtn') as HTMLButtonElement

const appEl = document.getElementById('app') as HTMLDivElement
const trayEl = document.getElementById('tray') as HTMLDivElement
const colorsEl = document.getElementById('colors') as HTMLDivElement
const effectsEl = document.getElementById('effects') as HTMLDivElement
const toolbarEl = document.getElementById('toolbar') as HTMLDivElement
const discoveryCountEl = document.getElementById('discoveryCount') as HTMLSpanElement
const requestEl = document.getElementById('request') as HTMLDivElement
const toastEl = document.getElementById('toast') as HTMLDivElement
const collectionBtn = document.getElementById('collectionBtn') as HTMLButtonElement
const collectionEl = document.getElementById('collection') as HTMLDivElement
const collectionCloseBtn = document.getElementById('collectionClose') as HTMLButtonElement
const collectionListEl = document.getElementById('collectionList') as HTMLDivElement
const printBtn = document.getElementById('printBtn') as HTMLButtonElement
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const albumBtn = document.getElementById('albumBtn') as HTMLButtonElement
const albumEl = document.getElementById('album') as HTMLDivElement
const albumCloseBtn = document.getElementById('albumClose') as HTMLButtonElement
const albumGridEl = document.getElementById('albumGrid') as HTMLDivElement
const confirmEl = document.getElementById('confirm') as HTMLDivElement
const confirmTextEl = document.getElementById('confirmText') as HTMLParagraphElement
const confirmYesBtn = document.getElementById('confirmYes') as HTMLButtonElement
const confirmNoBtn = document.getElementById('confirmNo') as HTMLButtonElement

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
const trayButtons = new Map<ComponentType, HTMLButtonElement>()
// every print, discovery or not - see album.ts. Newest-last; the Album
// view itself reverses this for display
let album: Snapshot[] = []
// recipe id -> the pieces of whichever print is currently that recipe's
// Collection thumbnail - starts as the first print that discovered it,
// replaceable later (see handlePrint's anyKnown branch)
let recipeShots: Record<string, Placed[]> = {}

// restore before anything below reads discoveredIds/stickers, so the tier
// unlocked from a prior visit and any in-progress canvas are there from the
// very first render rather than popping in after
const saved = loadGame()

if (saved) {
  const {
    discoveredIds: savedIds, stickers: savedStickers, album: savedAlbum, recipeShots: savedShots,
  } = saved

  savedIds.forEach(id => discoveredIds.add(id))
  stickers = savedStickers
  album = savedAlbum
  recipeShots = savedShots
  nextId = stickers.reduce((max, s) => Math.max(max, s.id + 1), nextId)
  nextGroupId = stickers.reduce((max, s) => Math.max(max, (s.groupId ?? 0) + 1), nextGroupId)
}

let unlocked = unlockedTypes(discoveredIds.size)

// the toast says *what* was discovered but not *where* - a burst pinpoints
// it, especially useful when several stickers are on the canvas at once.
// An array, not a single slot: printing can turn up more than one new
// discovery at a time if you built several valid clusters before printing.
interface Burst { x: number; y: number; at: number }
let discoveryBursts: Burst[] = []

// how many extra confetti bursts light up the canvas when the very last
// recipe gets discovered - more than a single recipe's own one burst, since
// this moment is meant to read as bigger than an ordinary discovery
const COMPLETION_BURST_COUNT = 8

// same shape as a discovery Burst plus the sticker's own color, since a
// landing burst is single-colored rather than confetti's fixed rainbow
// (see landingBurst.ts)
interface LandingBurstState extends Burst { color: string }
let landingBursts: LandingBurstState[] = []

const PRINT_FLOURISH_MS = 500

// a brief rise-then-settle applied only visually (not to the sticker's real
// x/y, so hit-testing and dragging are unaffected) right after printing
function printFlourish(p: Placed, now: number): number {
  if (p.printedAt === null) return 0

  const t = now - p.printedAt

  if (t < 0 || t > PRINT_FLOURISH_MS) return 0

  return -Math.sin((t / PRINT_FLOURISH_MS) * Math.PI) * 14
}

const SPAWN_FLOURISH_MS = 320

// a back-out ease: overshoots past 1 before settling there, giving a
// spring-like bounce - starts at 0 (t=0) and ends exactly at 1 (t=1), per
// https://easings.net/#easeOutBack. Reused for the landing scale multiplier
// below (see spawnFlourish) rather than a linear or simple sine ease,
// since the Placement & Composition Ideas doc specifically wants an
// overshoot-then-settle "squash and stretch" feel, not a smooth glide.
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1

  return 1 + c3 * ((t - 1) ** 3) + c1 * ((t - 1) ** 2)
}

// multiplies a freshly-placed sticker's own scale, briefly, right after
// spawn - starts near zero (a "slice" arriving mid-flight rather than a
// flat teleport) and overshoots past 1 before settling, like it dropped
// onto the canvas with a little weight. Purely visual, same convention as
// printFlourish above: never touches the sticker's real `scale`.
function spawnFlourish(p: Placed, now: number): number {
  if (p.spawnedAt === null) return 1

  const t = now - p.spawnedAt

  if (t < 0) return 1
  if (t > SPAWN_FLOURISH_MS) return 1

  return Math.max(0, easeOutBack(t / SPAWN_FLOURISH_MS))
}

function selected(): Placed | undefined {
  return stickers.find(s => s.id === selectedId)
}

function showToast(text: string, durationMs = 2200): void {
  toastEl.textContent = text
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), durationMs)
}

// resolved by whichever of #confirmYes/#confirmNo gets clicked below - an
// in-game replacement for window.confirm(), which looks and feels nothing
// like the rest of the game. Only one confirmation is ever open at a
// time, so a single stored resolver (rather than a queue) is enough.
let confirmResolve: ((ok: boolean) => void) | null = null

function showConfirm(text: string): Promise<boolean> {
  confirmTextEl.textContent = text
  confirmEl.classList.remove('hidden')

  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

// a key visual element (the doc's own framing after "still too small,
// tiny and blurry") gets a generous display size - text is free to wrap
// under/beside it and the panel already scrolls, so there's no reason to
// keep it icon-sized just to protect a single-line row
const THUMB_SIZE = 88

// Renders into a canvas buffer sized for the display's actual pixel
// density (devicePixelRatio), not just `displaySize` 1:1 - a canvas whose
// buffer resolution matches its CSS display size looks soft/blurry on any
// HiDPI screen, since the browser has to upscale it. CSS (.thumb /
// .album-item canvas) still controls the on-screen size; only the
// backing buffer (and what renderSnapshot draws into) is higher-res.
function renderThumb(pieces: Placed[], displaySize: number): HTMLCanvasElement {
  const bufferSize = Math.round(displaySize * (window.devicePixelRatio || 1))
  const thumbCanvas = document.createElement('canvas')

  thumbCanvas.width = bufferSize
  thumbCanvas.height = bufferSize
  renderSnapshot(thumbCanvas.getContext('2d') as CanvasRenderingContext2D, pieces, bufferSize)

  return thumbCanvas
}

// GDD SS16: "each discovered entry stores the *actual instance* that
// triggered it... as its representative image, not stock art" (Placement
// & Composition Ideas doc). A single wrapper (not two separate row
// children) so .discovery-row's justify-content:space-between still just
// pins it to the left, the same as the plain-text version used to.
function discoveredLabel(recipeId: string, name: string): HTMLSpanElement {
  const wrap = document.createElement('span')

  wrap.className = 'discovery-main'

  const pieces = recipeShots[recipeId]

  // falls back to no thumbnail if recipeShots somehow lacks an entry -
  // shouldn't happen once discovered, but an old save predating this
  // feature could have a discoveredIds entry with no matching shot
  if (pieces) {
    const thumb = renderThumb(pieces, THUMB_SIZE)

    thumb.className = 'thumb'
    wrap.appendChild(thumb)
  }

  const label = document.createElement('span')

  label.textContent = name
  wrap.appendChild(label)

  return wrap
}

function renderCollectionList(): void {
  collectionListEl.innerHTML = ''
  RECIPES.forEach((r) => {
    const found = discoveredIds.has(r.id)
    const row = document.createElement('div')

    row.className = found ? 'discovery-row found' : 'discovery-row'

    if (found) {
      row.appendChild(discoveredLabel(r.id, r.name))
    } else {
      // the hint used to live in a `title` tooltip - mouse-only, and
      // nothing on the row hinted that hovering would reveal anything.
      // Shown as ordinary row content instead, so it works the same on
      // touch and doesn't depend on the player discovering the hover
      const label = document.createElement('span')
      const hint = document.createElement('span')

      label.textContent = '???'
      hint.className = 'hint'
      hint.textContent = r.hint
      row.appendChild(label)
      row.appendChild(hint)
    }
    collectionListEl.appendChild(row)
  })
}

function updateDiscoveryCount(): void {
  discoveryCountEl.textContent = `✦ ${discoveredIds.size}/${RECIPES.length}`
}

const ALBUM_THUMB_SIZE = 64

// every print, discovery or not (GDD SS14's "Failure" outcome is still a
// real sticker) - re-rendered here from `album` rather than kept as a
// live DOM list, same "recompute on open" approach as Collection. Newest
// first, so the thing you just printed is the first thing you see.
function renderAlbumGrid(): void {
  albumGridEl.innerHTML = ''

  if (album.length === 0) {
    const empty = document.createElement('div')

    empty.id = 'albumEmpty'
    empty.textContent = 'Print something to start your album.'
    albumGridEl.appendChild(empty)

    return
  }

  const newestFirst = [...album].reverse()

  newestFirst.forEach((snap) => {
    const item = document.createElement('div')
    const thumb = renderThumb(snap.pieces, ALBUM_THUMB_SIZE)
    const label = document.createElement('span')

    item.className = 'album-item'

    const recipe = snap.recipeId === null ? null : RECIPES.find(r => r.id === snap.recipeId)

    label.textContent = recipe ? recipe.name : 'Custom'
    item.appendChild(thumb)
    item.appendChild(label)
    albumGridEl.appendChild(item)
  })
}

// GDD SS18's "request", kept proactive by construction - it's always on
// screen, never behind a hover or a click into the Collection panel (see
// pickRequest for why a fresh one doesn't need to be stored anywhere)
function updateRequest(): void {
  const request = pickRequest(discoveredIds, unlocked)

  requestEl.textContent = request ? `✦ Try: ${request.hint}` : "✦ You've discovered every sticker!"
}

// On wide viewports #request tucks under #mascot (see game.css) - but
// #stage's rendered width now varies (the canvas can shrink on short
// viewports), so it isn't always #app's widest child, and a fixed CSS
// offset from #app's own edge can drift out from under the mascot. This
// measures #mascot's actual rendered position and places #request
// relative to that instead, which stays correct regardless of which
// element ends up widest. Narrow viewports don't need any of this - the
// CSS default is an ordinary centered row, so this just clears any
// leftover inline position from a previous wide layout.
function positionRequest(): void {
  if (!window.matchMedia('(min-width: 640px)').matches) {
    requestEl.style.left = ''
    requestEl.style.top = ''

    return
  }

  const mascotRect = mascotCanvas.getBoundingClientRect()
  const appRect = appEl.getBoundingClientRect()

  requestEl.style.left = `${mascotRect.left - appRect.left}px`
  requestEl.style.top = `${mascotRect.bottom - appRect.top + 10}px`
}

// reflects the current unlock state onto the already-built tray buttons
// (they're created once at startup - see TRAY_ORDER.forEach below - and
// just get disabled/relabeled here, not recreated) so a locked piece can't
// be dragged in and reads as locked at a glance
function refreshTray(): void {
  const next = nextTier(discoveredIds.size)
  const remaining = next ? next.unlockAt - discoveredIds.size : 0

  trayButtons.forEach((btn, type) => {
    const isUnlocked = unlocked.has(type)

    btn.disabled = !isUnlocked
    btn.title = isUnlocked ?
      type :
      `Locked - ${remaining} more discover${remaining === 1 ? 'y' : 'ies'} to unlock`
  })
}

// called after every discovery-count change, not just on unlock, so the
// "N more to unlock" hint on still-locked pieces stays current. Detects a
// *new* tier unlock by comparing set sizes (grows only when a threshold is
// newly crossed) so the fanfare fires once, not on every print
function checkUnlocks(): void {
  const next = unlockedTypes(discoveredIds.size)

  if (next.size > unlocked.size) {
    unlocked = next
    // delayed rather than shown immediately - a print that both discovers
    // something *and* crosses an unlock threshold already put the
    // discovery's own toast up via showToast in handlePrint; queuing this
    // one after that toast's own 2200ms lets the player see both instead of
    // this one silently clobbering it
    window.setTimeout(() => {
      showToast('✦ New pieces unlocked!')
      playDiscovery()
      mascotExcited()
    }, 2300)
  }
  refreshTray()
}

// erases every discovered recipe and, as a direct consequence, every
// unlocked component (unlocked is always derived from discoveredIds.size -
// see progression.ts - so there's no separate unlock state to reset here).
// Confirmed first since there's no undo and this is real progress, not
// just the current canvas arrangement (see handleClearCanvas above for
// that distinction). Doesn't touch stickers - a fresh start on discoveries
// shouldn't silently delete whatever's still being built.
async function handleResetCollection(): Promise<void> {
  if (discoveredIds.size === 0) return
  if (!(await showConfirm('Reset all discovered recipes and unlocked pieces? This cannot be undone.'))) return

  discoveredIds.clear()
  // recipeShots are meaningless without their discovery - the album
  // journal itself is untouched, since it's a personal creation history
  // independent of discovery progress (see album.ts), not part of what
  // "progress" means here
  recipeShots = {}
  unlocked = unlockedTypes(0)
  refreshTray()
  updateDiscoveryCount()
  renderCollectionList()
  updateRequest()
  showToast('Collection reset')
  saveGame(discoveredIds, stickers, album, recipeShots)
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
type ClusterOutcome = 'swept' | 'new' | 'known' | 'custom'

async function handlePrint(): Promise<void> {
  if (stickers.length === 0) return

  // captured before this print's own discoveries land, so completion can be
  // detected as a transition (wasn't complete, now is) rather than firing on
  // every later print once the collection is already full
  const wasComplete = discoveredIds.size === RECIPES.length
  const now = performance.now()
  const clusters = clusterByOverlap(stickers.filter(s => s.groupId === null))
  const sweptIds = new Set<number>()

  // one cluster's worth of the old forEach body, pulled out so the loop
  // below can stay flat (a single await per iteration) instead of nesting
  // an early-exit path per case - `continue`/for-of are both off the
  // table under this project's eslint config, and a classic indexed loop
  // still lets each cluster's confirm() (if any) resolve before the next
  // cluster is processed, same sequencing the old synchronous
  // window.confirm() gave for free.
  async function processCluster(cluster: Placed[]): Promise<ClusterOutcome> {
    if (cluster.length === 1) {
      sweptIds.add(cluster[0].id)

      return 'swept'
    }

    const groupId = nextGroupId

    nextGroupId += 1
    cluster.forEach((s) => {
      s.groupId = groupId
      s.printedAt = now
    })

    // a shallow-copied snapshot, not the live objects - `cluster`'s pieces
    // keep getting dragged/moved as part of their group afterward, and the
    // album/Collection thumbnail should freeze the moment of printing, not
    // silently follow wherever the group ends up later
    const snapshot = cluster.map(s => ({ ...s }))
    const match = findMatch(cluster)

    if (!match) {
      // still a real sticker (GDD SS14's "Failure" outcome is explicitly
      // still a valid one) - the album journal is for every print, not
      // just the ones that named something
      album = addToAlbum(album, snapshot, null)

      return 'custom'
    }

    album = addToAlbum(album, snapshot, match.id)

    if (discoveredIds.has(match.id)) {
      showToast(match.name)
      // purely the player's own taste call, never forced - only offered
      // when there's an existing shot that could actually be replaced
      if (await showConfirm(`Use this as your picture for ${match.name}?`)) {
        recipeShots[match.id] = snapshot
      }

      return 'known'
    }

    discoveredIds.add(match.id)
    recipeShots[match.id] = snapshot
    showToast(`✦ ${match.name}!`)
    discoveryBursts.push({
      x: cluster.reduce((sum, s) => sum + s.x, 0) / cluster.length,
      y: cluster.reduce((sum, s) => sum + s.y, 0) / cluster.length,
      at: now,
    })

    return 'new'
  }

  let anySwept = false
  let anyNew = false
  let anyKnown = false
  let anyCustom = false

  for (let i = 0; i < clusters.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const outcome = await processCluster(clusters[i])

    if (outcome === 'swept') anySwept = true
    if (outcome === 'new') anyNew = true
    if (outcome === 'known') anyKnown = true
    if (outcome === 'custom') anyCustom = true
  }

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

  // anyKnown can still change what renderCollectionList shows (a replaced
  // representative shot, see the confirm() above), even with no new
  // discovery to react to
  if (anyNew || anyKnown) renderCollectionList()

  if (anyNew) {
    updateDiscoveryCount()
    checkUnlocks()
    updateRequest()
  }

  // no GDD-mandated "win state" (the design wants the game to stay fun
  // after progression ends), but the full collection is still worth a beat
  // - reuses the existing discovery burst/toast/sound systems wholesale
  // rather than building a new one, just more of each. Delayed the same way
  // checkUnlocks' own toast is, so it doesn't clobber this print's last
  // per-recipe toast the instant it appears.
  if (anyNew && !wasComplete && discoveredIds.size === RECIPES.length) {
    for (let i = 0; i < COMPLETION_BURST_COUNT; i += 1) {
      discoveryBursts.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        at: now,
      })
    }
    window.setTimeout(() => {
      showToast('🎉 Every sticker discovered!', 4000)
      playDiscovery()
      mascotExcited()
    }, 2300)
  }

  // printing is the single biggest state change (new groups, swept
  // singles, sometimes a new discovery/unlock) - always worth a save on
  // its own, rather than only relying on the pagehide/visibilitychange save
  // below to catch it whenever the tab eventually closes
  saveGame(discoveredIds, stickers, album, recipeShots)
}

// wipes the whole canvas at once (printed groups included) - unlike
// delete, which only ever touches the current selection, this needs its
// own confirmation since there's no undo and a full board can represent a
// lot of arranging. Doesn't touch discoveredIds - nothing about the
// player's actual progress lives on the canvas itself (no album/gallery
// exists yet - see the Placement & Composition Ideas doc), so clearing it
// only costs the current arrangement, not anything already discovered.
async function handleClearCanvas(): Promise<void> {
  if (stickers.length === 0) return
  if (!(await showConfirm('Clear the whole canvas?'))) return

  stickers = []
  selectedId = null
  playDelete()
  showToast('Canvas cleared')
  saveGame(discoveredIds, stickers, album, recipeShots)
}

function placeRaw(p: Placed, now: number): void {
  const scale = p.scale * spawnFlourish(p, now)

  ctx.save()
  ctx.translate(p.x, p.y + printFlourish(p, now))
  ctx.rotate(p.rotation)
  ctx.scale(p.flip ? -scale : scale, scale)
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
  // seamlessly into one shared margin regardless of that grouping. Printed
  // pieces get the chunkier width - a persistent "this one's finished" cue
  // that doesn't depend on selection (see the Placement & Composition
  // Ideas doc: the selection ring is centered on whichever single piece
  // was clicked, not the group's own merged shape, so it was never a good
  // fit for signalling "printed" in the first place)
  stickers.forEach((p) => {
    const width = p.groupId === null ? SHARED_OUTLINE_WIDTH : PRINTED_OUTLINE_WIDTH

    stampSilhouette(ctx, () => placeRaw(p, now), SHARED_OUTLINE_COLOR, width / p.scale)
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

  landingBursts = landingBursts.filter(b => now - b.at < LANDING_BURST_MS)
  landingBursts.forEach((b) => {
    ctx.save()
    ctx.translate(b.x, b.y)
    drawLandingBurst(ctx, now - b.at, b.color)
    ctx.restore()
  })

  const sel = selected()

  // printed stickers skip the ring entirely - it's centered on whichever
  // single piece was clicked, not the printed group's own merged shape, so
  // it never lined up with what's actually selected once pieces are fused
  // into one finished sticker (which already gets its own persistent cue,
  // the thicker shared outline above). Printed stickers also aren't being
  // carefully arranged piece-by-piece any more, so the "click here to keep
  // editing" affordance the ring exists for doesn't apply to them
  if (sel && sel.groupId === null) {
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

// how far a freshly-placed piece can land from dead-center
const SPAWN_SPREAD = 70
// keeps the spawn point (not just the sticker's visual center) far enough
// from the canvas edge that even a piece with a far-reaching extremity
// (balloon string, unicorn horn - see HIT_RADIUS's own comment above)
// doesn't spawn already clipped against the border
const SPAWN_MARGIN = HIT_RADIUS

// Placement & Composition Ideas doc: landing at a randomized spot near
// center, nudged away from whatever's already there, means two freshly
// placed pieces no longer perfectly overlap by default - composing a
// cluster now takes an actual drag-together step, without adding any
// friction to the click-to-place action itself. Not true collision
// avoidance (the doc's own call, given the canvas is small and pieces
// usually get dragged afterward anyway) - just a few randomized tries,
// keeping whichever one lands clearest.
function pickSpawnPosition(): { x: number; y: number } {
  let best = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = {
      x: Math.min(CANVAS_WIDTH - SPAWN_MARGIN, Math.max(SPAWN_MARGIN,
        CANVAS_WIDTH / 2 + (Math.random() * 2 - 1) * SPAWN_SPREAD)),
      y: Math.min(CANVAS_HEIGHT - SPAWN_MARGIN, Math.max(SPAWN_MARGIN,
        CANVAS_HEIGHT / 2 + (Math.random() * 2 - 1) * SPAWN_SPREAD)),
    }

    best = candidate
    if (!stickers.some(s => circlesTouch(candidate.x, candidate.y, 1, s.x, s.y, s.scale))) break
  }

  return best
}

function addSticker(type: ComponentType): void {
  // tray buttons already disable themselves for locked types (see
  // refreshTray), but guard the logic too rather than relying only on that
  if (!unlocked.has(type)) return

  const { x, y } = pickSpawnPosition()
  const now = performance.now()

  const p: Placed = {
    id: nextId,
    type,
    x,
    y,
    scale: 1,
    // always upright on landing - a random tilt here made it impossible to
    // get a piece perfectly straight again (no "reset rotation" action,
    // and the toolbar only rotates in fixed steps from wherever it is)
    rotation: 0,
    color: currentColor,
    flip: false,
    effect: 'none',
    groupId: null,
    printedAt: null,
    spawnedAt: now,
  }

  nextId += 1
  stickers.push(p)
  selectedId = p.id
  landingBursts.push({
    x, y, color: currentColor, at: now,
  })
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
  trayButtons.set(type, btn)
  trayEl.appendChild(btn)
})
refreshTray()

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
      ...sel, id: nextId, x: sel.x + 12, y: sel.y + 12, groupId: null, printedAt: null, spawnedAt: null,
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

// catches everything between prints (moving/recoloring/adding/deleting
// unprinted stickers) that handlePrint's own save doesn't see. pagehide
// covers normal close/reload/navigation; visibilitychange->hidden also
// covers mobile backgrounding, where pagehide can fire late or not at all
window.addEventListener('pagehide', () => saveGame(discoveredIds, stickers, album, recipeShots))
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame(discoveredIds, stickers, album, recipeShots)
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

albumBtn.addEventListener('click', () => {
  playClick()
  renderAlbumGrid()
  albumEl.classList.remove('hidden')
})

albumCloseBtn.addEventListener('click', () => {
  playClick()
  albumEl.classList.add('hidden')
})

function resolveConfirm(ok: boolean): void {
  playClick()
  confirmEl.classList.add('hidden')
  confirmResolve?.(ok)
  confirmResolve = null
}

confirmYesBtn.addEventListener('click', () => resolveConfirm(true))
confirmNoBtn.addEventListener('click', () => resolveConfirm(false))

printBtn.addEventListener('click', handlePrint)
clearBtn.addEventListener('click', handleClearCanvas)
resetBtn.addEventListener('click', handleResetCollection)

// reads as a "launch" moment, not a "discovery" one, but reuses the exact
// same burst array/renderer a discovery already uses (load-bearing decision
// #10 - different triggers, not different systems) rather than adding a
// dedicated title-screen effect
let titleVisible = true

startBtn.addEventListener('click', () => {
  titleVisible = false
  titleEl.classList.add('hidden')
  playClick()
  discoveryBursts.push({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, at: performance.now() })
})

updateDiscoveryCount()
renderCollectionList()
updateRequest()
positionRequest()
window.addEventListener('resize', positionRequest)

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

// a few Tier-1 pieces (unicorn itself skipped - the mascot already is one)
// bobbing around the title mascot, drawn with the same drawOutlined() look
// as real stickers so they don't read as separate visual language - "here's
// what you can build" rather than new decorative art
const TITLE_FLOATERS: { type: ComponentType; x: number; y: number; scale: number; phase: number; color: string }[] = [
  { type: 'rainbow', x: 40, y: 42, scale: 0.45, phase: 0, color: PALETTE[6] },
  { type: 'star', x: 240, y: 36, scale: 0.35, phase: 1.3, color: PALETTE[3] },
  { type: 'heart', x: 236, y: 132, scale: 0.35, phase: 2.6, color: PALETTE[0] },
  { type: 'cloud', x: 44, y: 130, scale: 0.4, phase: 4, color: PALETTE[7] },
]

const TITLE_MASCOT_SCALE = 1.8

// stops rescheduling itself once dismissed - no sense paying for a second
// mascot render once the player is in the actual game
function titleLoop(now: number): void {
  if (!titleVisible) return

  const rect = titleCanvas.getBoundingClientRect()
  const lookX = pointerScreenX - (rect.left + rect.width / 2)
  const lookY = pointerScreenY - (rect.top + rect.height / 2)

  // renderMascot() clears the whole canvas itself - scaling up first and
  // passing pre-scaled width/height keeps it centering correctly in the
  // scaled space (mascot.ts doesn't otherwise support a bigger size) - so
  // the floaters below have to be drawn *after*, or this clear would wipe
  // them
  titleCtx.save()
  titleCtx.scale(TITLE_MASCOT_SCALE, TITLE_MASCOT_SCALE)
  renderMascot(
    titleCtx, 280 / TITLE_MASCOT_SCALE, 170 / TITLE_MASCOT_SCALE, now, 0, lookX, lookY,
  )
  titleCtx.restore()

  TITLE_FLOATERS.forEach((f) => {
    titleCtx.save()
    titleCtx.translate(f.x, f.y + Math.sin(now / 900 + f.phase) * 6)
    titleCtx.scale(f.scale, f.scale)
    drawOutlined(titleCtx, () => COMPONENTS[f.type](titleCtx, f.color), 6)
    titleCtx.restore()
  })

  requestAnimationFrame(titleLoop)
}

requestAnimationFrame(titleLoop)
