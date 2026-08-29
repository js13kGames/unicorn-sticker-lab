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

export interface RecipeSizeTier { size: number; unlockAt: number }

// a prior session's deferred idea (progress doc): start with 2-ingredient
// recipes only, unlock bigger ones as progression advances. 6 was picked as
// the 3-ingredient threshold specifically so it lands after component
// Tier 2 (unlockAt: 3 above) - by 6 discoveries a player has already found
// several 2-ingredient recipes with the full 8-piece tray available, so
// they've had a real chance to explore pairs (including the 3 Tier-2-only
// pieces) before a third slot is worth introducing.
export const RECIPE_SIZE_TIERS: RecipeSizeTier[] = [
  { size: 2, unlockAt: 0 },
  { size: 3, unlockAt: 6 },
]

// the biggest recipe size currently matchable - findMatch uses this to
// treat a not-yet-unlocked bigger recipe as if it doesn't exist yet (an
// early 3-piece cluster just prints as a custom creation, same as any
// other non-matching cluster, until the size unlocks)
export function maxUnlockedRecipeSize(discoveryCount: number): number {
  return RECIPE_SIZE_TIERS.reduce(
    (max, t) => (discoveryCount >= t.unlockAt ? Math.max(max, t.size) : max), 0,
  )
}
