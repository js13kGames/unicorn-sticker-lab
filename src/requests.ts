import { RECIPES } from './recipes'
import type { Recipe } from './recipes'
import type { ComponentType, EffectType } from './types'

// GDD SS18's fuller vision (previously deferred as "a real lift"): a
// request phrased abstractly enough that several different recipes can
// each satisfy it - "MAKE SOMETHING THAT SPARKLES" matching any recipe
// with the sparkle effect, not just one specific combo. Turns out cheap
// after all *without* the deferred approach (a new per-recipe trait
// field): every category below is just a predicate over data recipes
// already carry (types/effects/colors/zOrder), so nothing new needs
// tagging - a recipe that happens to use the sparkle effect already
// "is" sparkly.
interface Category { hint: string; matches: (r: Recipe) => boolean }

const SKY_TYPES: ComponentType[] = ['rainbow', 'star', 'cloud', 'sun', 'moon']

const CATEGORIES: Category[] = [
  { hint: 'Make something that belongs up in the sky.', matches: r => r.types.some(t => SKY_TYPES.includes(t)) },
  { hint: 'Make something with a little magic in it.', matches: r => r.types.includes('unicorn') },
  { hint: 'Make something fit for a celebration.', matches: r => r.types.includes('balloon') },
  { hint: 'Make something that sparkles.', matches: r => !!r.effects?.includes('sparkle') },
  { hint: 'Make something out of two matching colors.', matches: r => !!r.colors },
  { hint: 'Make something where one piece hides behind another.', matches: r => !!r.zOrder },
]

// GDD SS18 (Requests/Challenges): a "request" is whichever prompt is
// currently being surfaced - one at a time, always the same one until
// it's satisfied (recomputed fresh from discoveredIds/unlocked each call,
// not stored state - nothing to keep in sync or drift out of date).
// Prefers a category not yet satisfied by anything already discovered,
// with at least one currently-buildable (component-unlocked, size-
// unlocked) recipe that could satisfy it, in the fixed order above -
// broader categories first, narrower ones (a single specific recipe,
// today) later. Falls back to the single-recipe-hint behavior from
// before once every category is satisfied or none are buildable yet, so
// something is still shown rather than going empty.
export function pickRequest(
  discoveredIds: Set<string>, unlocked: Set<ComponentType>, maxSize: number, unlockedEffects: Set<EffectType>,
): { hint: string } | undefined {
  // a recipe asking for an effect (only `sparkle` today - see
  // EFFECT_TIERS in progression.ts) isn't buildable until that effect is
  // too, or its own category ("Make something that sparkles") would get
  // surfaced before the player can actually select it
  const buildable = (r: Recipe): boolean => (
    r.types.length <= maxSize &&
    r.types.every(t => unlocked.has(t)) &&
    (!r.effects || r.effects.every(e => unlockedEffects.has(e)))
  )

  const category = CATEGORIES.find(c => (
    !RECIPES.some(r => c.matches(r) && discoveredIds.has(r.id)) &&
    RECIPES.some(r => c.matches(r) && buildable(r))
  ))

  if (category) return { hint: category.hint }

  const remaining = RECIPES.filter(r => !discoveredIds.has(r.id))
  const single = remaining.find(buildable) ?? remaining[0]

  return single && { hint: single.hint }
}
