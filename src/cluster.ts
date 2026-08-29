import type { Placed } from './types'

// Tighter than HIT_RADIUS (which pads generously for clicking/selecting) -
// this is roughly a component's own visual size, so two stickers only
// "touch" when they'd actually look combined, not just nearby.
const CLUSTER_RADIUS = 40

// Exported so anything else that needs "would these two circles read as
// touching" (currently just index.ts's avoidant spawn placement) uses the
// exact same definition Print itself clusters by, rather than a second
// radius that could drift out of sync with it.
export function circlesTouch(
  ax: number, ay: number, ascale: number, bx: number, by: number, bscale: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const reach = CLUSTER_RADIUS * ascale + CLUSTER_RADIUS * bscale

  return Math.sqrt(dx * dx + dy * dy) < reach
}

function overlaps(a: Placed, b: Placed): boolean {
  return circlesTouch(a.x, a.y, a.scale, b.x, b.y, b.scale)
}

// Groups stickers into overlap-connected clusters (transitively touching
// circles - if A touches B and B touches C, all three are one cluster even
// if A and C don't touch directly) via a simple BFS. Cheap enough for a
// handful of stickers; no need for a proper union-find.
export function clusterByOverlap(stickers: Placed[]): Placed[][] {
  const visited = new Set<number>()
  const clusters: Placed[][] = []

  stickers.forEach((start) => {
    if (visited.has(start.id)) return

    const idsInCluster = new Set<number>([start.id])
    const queue = [start]

    visited.add(start.id)

    while (queue.length) {
      const current = queue.pop() as Placed

      stickers.forEach((other) => {
        if (!visited.has(other.id) && overlaps(current, other)) {
          visited.add(other.id)
          idsInCluster.add(other.id)
          queue.push(other)
        }
      })
    }

    // rebuild from the original array instead of collecting in BFS visit
    // order, so each cluster keeps the stickers' original relative layer
    // order (front-to-back) rather than scrambling it based on traversal
    clusters.push(stickers.filter(s => idsInCluster.has(s.id)))
  })

  return clusters
}
