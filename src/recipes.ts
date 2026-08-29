import type { ComponentType } from './types'

export interface Recipe {
  id: string
  // a plain array, not a 2-tuple: the installed @typescript-eslint/parser
  // (pinned old for ESLint 5 compatibility) crashes parsing tuple types
  types: ComponentType[]
  name: string
  hint: string
}

// Deliberately simple for this vertical slice: a flat list of pairs, not
// trait-based rules or discovery chains (GDD SS35 leaves that open - explicit
// pairs is the "simplest viable implementation" for ~10 recipes). A
// discovery needs an *exact* match - the canvas's distinct component types
// have to equal a recipe's types, not just contain them - so building a
// bigger sticker for its own sake never trivially satisfies every recipe
// that shares a piece with it. Position/color/scale/count of each type
// don't matter, only which distinct types are present.
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
]

// Returns the first not-yet-discovered recipe now exactly satisfied by
// what's on the canvas, or undefined if there isn't one.
export function findNewDiscovery(
  presentTypes: Set<ComponentType>,
  discoveredIds: ReadonlySet<string>,
): Recipe | undefined {
  return RECIPES.find(
    r => !discoveredIds.has(r.id) &&
      r.types.length === presentTypes.size &&
      r.types.every(t => presentTypes.has(t)),
  )
}
