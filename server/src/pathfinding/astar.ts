
/**
 * AisleVision - A* Pathfinding Algorithm
 *
 * Finds the shortest walkable path between two points
 * on a 2D grocery store map.
 *
 * 0 = Walkable
 * 1 = Blocked (shelves, walls, obstacles)
 */

export type Point = [number, number];
export type Grid = number[][];

// Converts coordinates into a unique string
const pointKey = ([x, y]: Point): string => `${x},${y}`;

// Manhattan distance heuristic
function manhattan(a: Point, b: Point): number {
  return (
    Math.abs(a[0] - b[0]) +
    Math.abs(a[1] - b[1])
  );
}

// Check whether a cell can be walked on
export function isWalkable(
  grid: Grid,
  [x, y]: Point
): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    y >= 0 &&
    y < grid.length &&
    x >= 0 &&
    x < (grid[0]?.length ?? 0) &&
    grid[y][x] === 0
  );
}

/**
 * Find shortest path using A*
 *
 * @param grid - 2D store map
 * @param start - Starting coordinates [x, y]
 * @param goal - Destination coordinates [x, y]
 *
 * @returns Array of coordinates or null
 */
export function findPath(
  grid: Grid,
  start: Point,
  goal: Point
): Point[] | null {

  // Validate grid and coordinates
  if (
    !grid.length ||
    !grid[0]?.length ||
    !grid.every(
      row =>
        row.length === grid[0].length &&
        row.every(cell => cell === 0 || cell === 1)
    ) ||
    !isWalkable(grid, start) ||
    !isWalkable(grid, goal)
  ) {
    return null;
  }

  // Nodes waiting to be explored
  const open: Point[] = [start];

  const openKeys = new Set<string>([
    pointKey(start)
  ]);

  // Nodes that have already been explored
  const closed = new Set<string>();

  // Tracks previous node for reconstructing path
  const previous = new Map<string, Point>();

  // Cost from start to each node
  const g = new Map<string, number>([
    [pointKey(start), 0]
  ]);

  // Allowed movement directions
  const directions: Point[] = [
    [1, 0],   // Right
    [-1, 0],  // Left
    [0, 1],   // Down
    [0, -1]   // Up
  ];

  while (open.length > 0) {

    // Find node with smallest f(n) = g(n) + h(n)
    let best = 0;

    for (let i = 1; i < open.length; i++) {

      const currentF =
        (g.get(pointKey(open[i])) ?? Infinity) +
        manhattan(open[i], goal);

      const bestF =
        (g.get(pointKey(open[best])) ?? Infinity) +
        manhattan(open[best], goal);

      if (currentF < bestF) {
        best = i;
      }
    }

    // Explore the best node
    const current = open.splice(best, 1)[0];
    const currentKey = pointKey(current);

    openKeys.delete(currentKey);

    // Goal reached!
    if (currentKey === pointKey(goal)) {

      const result: Point[] = [current];
      let cursor = currentKey;

      // Reconstruct complete path
      while (previous.has(cursor)) {

        const p = previous.get(cursor)!;

        result.unshift(p);
        cursor = pointKey(p);
      }

      return result;
    }

    closed.add(currentKey);

    // Check four neighboring cells
    for (const [dx, dy] of directions) {

      const next: Point = [
        current[0] + dx,
        current[1] + dy
      ];

      const nextKey = pointKey(next);

      // Skip blocked or already explored cells
      if (
        !isWalkable(grid, next) ||
        closed.has(nextKey)
      ) {
        continue;
      }

      // Every movement costs 1
      const newCost =
        (g.get(currentKey) ?? Infinity) + 1;

      // Update if a shorter path is found
      if (
        newCost <
        (g.get(nextKey) ?? Infinity)
      ) {

        previous.set(nextKey, current);
        g.set(nextKey, newCost);

        if (!openKeys.has(nextKey)) {

          open.push(next);
          openKeys.add(nextKey);
        }
      }
    }
  }

  // No possible route
  return null;
}

