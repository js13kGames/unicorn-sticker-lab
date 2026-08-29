import { COMPONENTS } from './components'
import { RECIPES } from './recipes'
import type { Placed } from './types'

const KEY = 'usl-save'

interface SaveData {
  d: string[] // discovered recipe ids
  s: Placed[] // canvas stickers (printed and unprinted) - GDD SS26's "possibly
              // the current sticker", so a reload doesn't lose work in progress
}

export function saveGame(discoveredIds: Set<string>, stickers: Placed[]): void {
  try {
    const data: SaveData = { d: [...discoveredIds], s: stickers }

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
export function loadGame(): { discoveredIds: Set<string>; stickers: Placed[] } | null {
  try {
    const raw = localStorage.getItem(KEY)

    if (!raw) return null

    const data = JSON.parse(raw) as SaveData
    const knownIds = new Set(RECIPES.map(r => r.id))
    const discoveredIds = new Set(data.d.filter(id => knownIds.has(id)))
    const stickers = data.s.filter(p => p.type in COMPONENTS)

    return { discoveredIds, stickers }
  } catch {
    return null
  }
}
