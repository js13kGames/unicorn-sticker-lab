export type ComponentType =
  | 'unicorn'
  | 'rainbow'
  | 'star'
  | 'cloud'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'balloon'

export interface Placed {
  id: number
  type: ComponentType
  x: number
  y: number
  scale: number
  rotation: number
  color: string
  flip: boolean
}
