import type { Placed } from './types'

// Tighter than HIT_RADIUS (which pads generously for clicking/selecting) -
// this is roughly a component's own visual size, so two stickers only
// "touch" when they'd actually look combined, not just nearby.
const CLUSTER_RADIUS = 40

function overlaps(a: Placed, b: Placed): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const reach = CLUSTER_RADIUS * a.scale + CLUSTER_RADIUS * b.scale

  return Math.sqrt(dx * dx + dy * dy) < reach
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
