import type { ComponentType } from './types'

export interface Tier {
  types: ComponentType[]
  unlockAt: number
}

// GDD SS17 wants unlock tiers, but only names 5 of Tier 1's pieces
// (unicorn/rainbow/star/cloud/heart) - the other 3 built components
// (sun/moon/balloon) were added during the vertical slice and aren't in the
// GDD's own tier lists. Rather than invent new procedural art to fill out
// tiers 2-5 (a real content addition, deferred - see the progress doc),
// this reuses exactly what already exists: Tier 1 is the GDD's own starter
// set, Tier 2 is the rest, unlocked once the player has proven they
// understand discovery by finding a few Tier-1-only recipes.
export const TIERS: Tier[] = [
  { types: ['unicorn', 'rainbow', 'star', 'cloud', 'heart'], unlockAt: 0 },
  { types: ['sun', 'moon', 'balloon'], unlockAt: 3 },
]

export function unlockedTypes(discoveryCount: number): Set<ComponentType> {
  const set = new Set<ComponentType>()

  TIERS.forEach((t) => {
    if (discoveryCount >= t.unlockAt) t.types.forEach(c => set.add(c))
  })

  return set
}

// the next tier still locked, if any - used to word the "N more to unlock"
// hint on locked tray pieces
export function nextTier(discoveryCount: number): Tier | undefined {
  return TIERS.find(t => t.unlockAt > discoveryCount)
}
