
/**
 * AisleVision - Multi-Item Route Planner
 *
 * Uses A* to find an efficient route through
 * multiple grocery store aisles.
 */

import {
  findPath,
  type Point
} from './astar.js';

import type { StoreMap } from './storeMap.js';

// Output returned by the route planner
export type RouteResult = {
  visitOrder: string[];
  path: Point[];
  totalSteps: number;
};

/**
 * Plan a route through a shopping checklist.
 *
 * @param map - Store map
 * @param aisleIds - Aisles containing shopping items
 * @param start - Shopper's starting coordinate
 * @param finishAtCheckout - End route at checkout?
 */
export function planRoute(
  map: StoreMap,
  aisleIds: string[],
  start: Point = map.entrance,
  finishAtCheckout = false
): RouteResult | null {

  // Avoid excessive computation
  if (aisleIds.length > 8) {
    throw new Error(
      'Demo planner supports up to 8 aisles'
    );
  }

  // Remove duplicates and normalize aisle names
  const unique = [
    ...new Set(
      aisleIds.map(id => id.toUpperCase())
    )
  ];

  // Check that every aisle exists in the map
  for (const id of unique) {
    if (!Object.hasOwn(map.aisles, id)) {
      throw new Error(`Unknown aisle: ${id}`);
    }
  }

  let best: RouteResult | null = null;

  /**
   * Recursively try each possible visiting order.
   */
  function explore(
    at: Point,
    remaining: string[],
    order: string[],
    traveled: Point[]
  ): void {

    // All items visited
    if (remaining.length === 0) {

      let path = traveled;

      // Optionally navigate to checkout
      if (finishAtCheckout) {

        const tail = findPath(
          map.grid,
          at,
          map.checkout
        );

        if (!tail) return;

        // Skip duplicate starting cell
        path = [
          ...path,
          ...tail.slice(1)
        ];
      }

      const totalSteps = path.length - 1;

      // Save best route found
      if (
        !best ||
        totalSteps < best.totalSteps
      ) {
        best = {
          visitOrder: order,
          path,
          totalSteps
        };
      }

      return;
    }

    // Try each unvisited aisle
    for (const aisle of remaining) {

      const destination = map.aisles[aisle];

      // A* finds the shortest path to this aisle
      const leg = findPath(
        map.grid,
        at,
        destination
      );

      if (!leg) continue;

      const nextPath = [
        ...traveled,
        ...leg.slice(1)
      ];

      // Skip routes that are already too long
      if (
        best &&
        nextPath.length - 1 >= best.totalSteps
      ) {
        continue;
      }

      // Continue planning remaining stops
      explore(
        destination,
        remaining.filter(x => x !== aisle),
        [...order, aisle],
        nextPath
      );
    }
  }

  // Begin search from shopper's position
  explore(
    start,
    unique,
    [],
    [start]
  );

  return best;
}

