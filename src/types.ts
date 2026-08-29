export type ComponentType =
  | 'unicorn'
  | 'rainbow'
  | 'star'
  | 'cloud'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'balloon'

export type EffectType = 'none' | 'sparkle' | 'glow' | 'hearts'

export interface Placed {
  id: number
  type: ComponentType
  x: number
  y: number
  scale: number
  rotation: number
  color: string
  flip: boolean
  effect: EffectType
  // set together by Print: stickers sharing a groupId move/delete as one
  // unit from then on, and printedAt drives the brief "float up" flourish
  groupId: number | null
  printedAt: number | null
}
