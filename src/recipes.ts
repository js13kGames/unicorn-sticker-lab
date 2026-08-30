import type { ComponentType, EffectType, Placed } from './types'

export interface Recipe {
  id: string
  // a plain array, not a 2-tuple: the installed @typescript-eslint/parser
  // (pinned old for ESLint 5 compatibility) crashes parsing tuple types
  types: ComponentType[]
  name: string
  hint: string
  // Optional extra conditions, on top of the type-set every recipe already
  // needs - most recipes skip these. `colors`/`effects` follow the exact
  // same "distinct set present must equal this, nothing more/less" rule as
  // `types` (see findMatch) rather than a fuzzy "contains" check, so a
  // match stays unambiguous - see the Placement & Composition Ideas doc's
  // "Composition encouragement, take 2". `effects` ignores 'none': that's
  // "no effect chosen" on a piece, not a real effect a recipe can ask for.
  colors?: string[]
  effects?: EffectType[]
  // an occasional binary placement gate, hand-picked for one specific
  // recipe rather than a general arrangement-quality score (that idea was
  // explicitly rejected - see the same doc): `front`'s piece must be drawn
  // on top of (later in z-order than) `behind`'s.
  zOrder?: { front: ComponentType; behind: ComponentType }
}

// Deliberately simple for this vertical slice: a flat list of pairs, not
// trait-based rules or discovery chains (GDD SS35 leaves that open - explicit
// pairs is the "simplest viable implementation" for ~10 recipes). A
// discovery needs an *exact* match - the canvas's distinct component types
// have to equal a recipe's types, not just contain them - so building a
// bigger sticker for its own sake never trivially satisfies every recipe
// that shares a piece with it. Position/color/scale/count of each type
// don't matter unless a recipe opts into `colors`/`effects`/`zOrder` above.
export const RECIPES: Recipe[] = [
  {
    id: 'rainbow-unicorn',
    types: ['unicorn', 'rainbow'],
    name: 'Rainbow Unicorn',
    hint: 'Something magical that belongs in the sky.',
  },
  {
    id: 'celestial-unicorn',
    types: ['unicorn', 'star'],
    name: 'Celestial Unicorn',
    hint: 'A unicorn fit for the night sky.',
  },
  {
    id: 'midnight-unicorn',
    types: ['unicorn', 'moon'],
    name: 'Midnight Unicorn',
    hint: 'What does a sleepy unicorn dream about?',
  },
  {
    id: 'party-unicorn',
    types: ['unicorn', 'balloon'],
    name: 'Party Unicorn',
    hint: 'Make something fit for a celebration.',
  },
  {
    id: 'rainbow-cloud',
    types: ['rainbow', 'cloud'],
    name: 'Rainbow Cloud',
    hint: 'Something colorful floating up high.',
  },
  {
    id: 'starry-night',
    types: ['star', 'moon'],
    name: 'Starry Night',
    hint: 'Two things you see after dark.',
  },
  {
    id: 'sunny-sky',
    types: ['sun', 'cloud'],
    name: 'Sunny Sky',
    hint: 'A bright day with a little cover.',
  },
  {
    id: 'love-balloon',
    types: ['heart', 'balloon'],
    name: 'Love Balloon',
    hint: 'Send someone your love, sky-high.',
  },
  {
    id: 'wishing-star',
    types: ['heart', 'star'],
    name: 'Wishing Star',
    hint: 'Make a wish on something twinkling.',
  },
  {
    id: 'double-rainbow',
    types: ['rainbow', 'sun'],
    name: 'Double Rainbow',
    hint: 'What appears when the sun meets the rain?',
  },
  {
    id: 'ghost-unicorn',
    types: ['unicorn', 'cloud'],
    colors: ['#ffffff'],
    name: 'Ghost Unicorn',
    hint: 'Paint them both the same pale shade - hide it in plain sight.',
  },
  {
    id: 'shooting-rainbow',
    types: ['rainbow', 'star'],
    effects: ['sparkle'],
    name: 'Shooting Rainbow',
    hint: 'Add a little sparkle - watch it shoot across the sky.',
  },
  {
    id: 'peekaboo-moon',
    types: ['moon', 'cloud'],
    zOrder: { front: 'moon', behind: 'cloud' },
    name: 'Peekaboo Moon',
    hint: "Who's hiding behind the clouds? Bring it out front.",
  },
  // 3-ingredient recipes - gated behind RECIPE_SIZE_TIERS (progression.ts),
  // not buildable until the player has some experience with pairs first.
  // Being a superset of an existing pair's types is fine, not ambiguous -
  // exact-set matching (see findMatch) means a 3-type cluster can never
  // match a 2-type recipe or vice versa.
  {
    id: 'sunshower',
    types: ['sun', 'cloud', 'rainbow'],
    name: 'Sunshower',
    hint: "Sun's out and it's raining - what does that make?",
  },
  {
    id: 'cosmic-unicorn',
    types: ['unicorn', 'rainbow', 'star'],
    name: 'Cosmic Unicorn',
    hint: 'The ultimate magical creature - spare no ingredient.',
  },
  {
    id: 'birthday-wish',
    types: ['heart', 'star', 'balloon'],
    name: 'Birthday Wish',
    hint: "A wish, a treat, and something sky-high - what's the occasion?",
  },
]

function setEquals<T>(want: T[], have: Set<T>): boolean {
  return want.length === have.size && want.every(v => have.has(v))
}

// Returns the recipe a printed cluster satisfies, regardless of whether
// it's already been discovered - printing needs to tell new/known/no-match
// apart, all from the same lookup. Takes the whole cluster, not just its
// types, because a recipe's optional colors/effects/zOrder conditions (see
// Recipe above) need the actual pieces, not just which types are present.
// `maxSize` is the biggest recipe size progression currently allows
// (progression.ts's maxUnlockedRecipeSize) - a recipe bigger than that is
// treated as if it doesn't exist yet, so an early 3-piece cluster just
// prints as an ordinary custom creation until 3-ingredient recipes unlock.
export function findMatch(cluster: Placed[], maxSize: number): Recipe | undefined {
  const presentTypes = new Set(cluster.map(s => s.type))
  const presentColors = new Set(cluster.map(s => s.color))
  const presentEffects = new Set(cluster.map(s => s.effect).filter(e => e !== 'none'))

  return RECIPES.find((r) => {
    if (r.types.length > maxSize) return false
    if (!setEquals(r.types, presentTypes)) return false
    if (r.colors && !setEquals(r.colors, presentColors)) return false
    if (r.effects && !setEquals(r.effects, presentEffects)) return false

    if (r.zOrder) {
      const { front, behind } = r.zOrder
      const frontIdx = cluster.findIndex(s => s.type === front)
      const behindIdx = cluster.findIndex(s => s.type === behind)

      if (frontIdx === -1 || behindIdx === -1 || frontIdx < behindIdx) return false
    }

    return true
  })
}
