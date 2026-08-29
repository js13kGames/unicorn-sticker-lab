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
}
