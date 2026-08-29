import { COMPONENTS } from './components'
import { RECIPES } from './recipes'
import type { Placed } from './types'
import type { Snapshot } from './album'

const KEY = 'usl-save'

interface SaveData {
  d: string[] // discovered recipe ids
  s: Placed[] // canvas stickers (printed and unprinted) - GDD SS26's "possibly
              // the current sticker", so a reload doesn't lose work in progress
  a: Snapshot[] // the running "every print" album journal
  r: Record<string, Placed[]> // recipe id -> the pieces of whichever print
                               // is currently its Collection representative
}

export function saveGame(
  discoveredIds: Set<string>, stickers: Placed[], album: Snapshot[], recipeShots: Record<string, Placed[]>,
): void {
  try {
    const data: SaveData = {
      d: [...discoveredIds], s: stickers, a: album, r: recipeShots,
    }

    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // localStorage can throw (quota, private browsing) - losing a save
    // silently is fine, the game must keep working either way
  }
}

// localStorage is an external boundary - a save from a future/older build,
// or hand-edited devtools data, could reference a recipe or component type
// that no longer exists. Filtering here (rather than trusting the JSON
// verbatim) keeps a stale/corrupt save from crashing COMPONENTS[type]
// lookups or findMatch elsewhere, instead of needing every later call site
// to defend against it.
export function loadGame(): {
  discoveredIds: Set<string>
  stickers: Placed[]
  album: Snapshot[]
  recipeShots: Record<string, Placed[]>
} | null {
  try {
    const raw = localStorage.getItem(KEY)

    if (!raw) return null

    const data = JSON.parse(raw) as SaveData
    const knownIds = new Set(RECIPES.map(r => r.id))
    const validPieces = (pieces: Placed[]): Placed[] => pieces.filter(p => p.type in COMPONENTS)

    const discoveredIds = new Set(data.d.filter(id => knownIds.has(id)))
    const stickers = validPieces(data.s ?? [])
    const album = (data.a ?? [])
      .filter(snap => snap.recipeId === null || knownIds.has(snap.recipeId))
      .map(snap => ({ ...snap, pieces: validPieces(snap.pieces) }))
      .filter(snap => snap.pieces.length > 0)
    const recipeShots: Record<string, Placed[]> = {}

    Object.keys(data.r ?? {}).forEach((id) => {
      if (!knownIds.has(id)) return

      const pieces = validPieces(data.r[id])

      if (pieces.length > 0) recipeShots[id] = pieces
    })

    return {
      discoveredIds, stickers, album, recipeShots,
    }
  } catch {
    return null
  }
}
