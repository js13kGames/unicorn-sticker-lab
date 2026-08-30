import { RECIPES } from './recipes'
import type { ComponentType, EffectType } from './types'

export interface Tier<T> { types: T[]; unlockAt: number }

// GDD SS17 wants unlock tiers, but only names 5 of Tier 1's pieces
// (unicorn/rainbow/star/cloud/heart) - the other 3 built components
// (sun/moon/balloon) were added during the vertical slice and aren't in the
// GDD's own tier lists. Rather than invent new procedural art to fill out
// tiers 2-5 (a real content addition, deferred - see the progress doc),
// this reuses exactly what already exists: Tier 1 is the GDD's own starter
// set, the rest trickle in one piece at a time rather than all 3 at once.
//
// Unlocking sun/moon/balloon together at a single threshold (the original
// shape here) meant one bumper reward early on, then nothing at all for
// the remaining two-thirds of the collection - every recipe past that
// point was already reachable, so there was no unlock left to build
// toward. Spacing them out (plus RECIPE_SIZE_TIERS/EFFECT_TIERS below)
// turns 2 unlock moments into a steady handful, without adding a single
// new asset: same 8 components, same 16 recipes, just staggered. Each
// threshold still leaves a comfortable pool of not-yet-found recipes
// buildable from the pieces already unlocked (see the recipe-count math
// in RECIPE_SIZE_TIERS' own comment below), so nobody hits an unlock wall
// before they're ready.
// the last tier: a joke sticker (see drawGooglyEyes in components.ts), not
// another themed piece - a reward for full completion rather than one more
// thing progression is gated on, so it unlocks at RECIPES.length rather
// than being spaced in with the others above
export const TIERS: Tier<ComponentType>[] = [
  { types: ['unicorn', 'rainbow', 'star', 'cloud', 'heart'], unlockAt: 0 },
  { types: ['sun'], unlockAt: 2 },
  { types: ['moon'], unlockAt: 4 },
  { types: ['balloon'], unlockAt: 6 },
  { types: ['googlyEyes'], unlockAt: RECIPES.length },
]

// generic across TIERS/EFFECT_TIERS - both are just "a set of things that
// become available once discoveryCount crosses a threshold"
function unlockedFrom<T>(tiers: Tier<T>[], discoveryCount: number): Set<T> {
  const set = new Set<T>()

  tiers.forEach((t) => {
    if (discoveryCount >= t.unlockAt) t.types.forEach(x => set.add(x))
  })

  return set
}

// which tier gates a specific item - used to word the "N more to unlock"
// hint on a locked tray/effect button for exactly the item it's on, not
// whichever tier happens to unlock next overall. Those are usually the
// same thing when tiers are closely spaced, but TIERS' own tail tier (the
// googly-eyes completion reward, way out at RECIPES.length) makes the gap
// obvious: while sun/moon/balloon are still locked, a locked googly-eyes
// button showing "N more" for whichever of *those* unlocks next would be
// nowhere close to true.
function tierOf<T>(tiers: Tier<T>[], item: T): Tier<T> | undefined {
  return tiers.find(t => t.types.includes(item))
}

export function unlockedTypes(discoveryCount: number): Set<ComponentType> {
  return unlockedFrom(TIERS, discoveryCount)
}

export function tierForType(type: ComponentType): Tier<ComponentType> | undefined {
  return tierOf(TIERS, type)
}

// 'none' is always available (unlockAt: 0) since it's not a real effect to
// unlock, just "no effect chosen." Sparkle lands almost immediately
// (discovery 1) since Shooting Rainbow - a pair of two Tier-1 starter
// pieces - already needs it; glow/hearts land later since no recipe
// currently requires either, so they're free to just be a nice surprise
// rather than something progression is gated on. Interleaved with
// TIERS/RECIPE_SIZE_TIERS' own thresholds (2/4/6/9) rather than
// clustered, for the same "steady handful of unlock moments" reason
// described above TIERS.
export const EFFECT_TIERS: Tier<EffectType>[] = [
  { types: ['none'], unlockAt: 0 },
  { types: ['sparkle'], unlockAt: 1 },
  { types: ['glow'], unlockAt: 5 },
  { types: ['hearts'], unlockAt: 8 },
]

export function unlockedEffects(discoveryCount: number): Set<EffectType> {
  return unlockedFrom(EFFECT_TIERS, discoveryCount)
}

export function tierForEffect(effect: EffectType): Tier<EffectType> | undefined {
  return tierOf(EFFECT_TIERS, effect)
}

export interface RecipeSizeTier { size: number; unlockAt: number }

// a prior session's deferred idea (progress doc): start with 2-ingredient
// recipes only, unlock bigger ones as progression advances. 9 lands after
// every component tier above (the last, balloon, unlocks at 6) - by then
// all 8 pieces are available and every 2-ingredient recipe (13 of them) is
// buildable, so a third slot has real pairs to build on top of rather than
// showing up before the tray's even full. The buildable-but-undiscovered
// pool at each step: 6 recipes from the Tier-1 starter set alone, growing
// to 8/11/13 as sun/moon/balloon each land - comfortably ahead of the
// discovery counts (2/4/6) needed to cross those thresholds, so nobody
// runs out of new things to try between one unlock and the next.
export const RECIPE_SIZE_TIERS: RecipeSizeTier[] = [
  { size: 2, unlockAt: 0 },
  { size: 3, unlockAt: 9 },
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
