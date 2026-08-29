import { RECIPES } from './recipes'
import type { Recipe } from './recipes'
import type { ComponentType } from './types'

// GDD SS18 (Requests/Challenges) kept deliberately lightweight: rather than
// a separate request data structure with its own multi-solution matching,
// a "request" is just whichever undiscovered recipe's own SS15 hint is
// currently being surfaced. One recipe at a time, always the same one
// until it's found (recomputed fresh from discoveredIds/unlocked each
// call, not stored state - nothing to keep in sync or drift out of date).
//
// Prefers a recipe buildable from currently-unlocked components, so the
// request never asks for something the player doesn't have access to yet;
// only falls back to a locked recipe once every unlocked one is already
// discovered, so something is still shown rather than going empty early.
export function pickRequest(discoveredIds: Set<string>, unlocked: Set<ComponentType>): Recipe | undefined {
  const remaining = RECIPES.filter(r => !discoveredIds.has(r.id))

  return remaining.find(r => r.types.every(t => unlocked.has(t))) ?? remaining[0]
}
