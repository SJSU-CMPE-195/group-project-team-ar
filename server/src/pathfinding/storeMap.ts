
/**
 * AisleVision - Store Map Loader
 *
 * Reads the store map JSON file and validates
 * its grid and aisle locations.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isWalkable,
  type Grid,
  type Point
} from './astar.js';

// Store map data structure
export type StoreMap = {
  name: string;
  grid: Grid;
  entrance: Point;
  checkout: Point;
  aisles: Record<string, Point>;
};

// Find the server/data directory
const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data'
);

/**
 * Loads a JSON store map.
 */
export function loadStoreMap(
  filename = 'demo_store_map.json'
): StoreMap {

  const filePath = path.join(dataDir, filename);

  const data = JSON.parse(
    readFileSync(filePath, 'utf8')
  ) as StoreMap;

  // Validate the map grid
  if (
    !data.grid?.length ||
    !data.grid[0]?.length ||
    !data.grid.every(
      row =>
        row.length === data.grid[0].length &&
        row.every(cell => cell === 0 || cell === 1)
    )
  ) {
    throw new Error('Invalid map grid');
  }

  // Collect all important destinations
  const locations = [
    data.entrance,
    data.checkout,
    ...Object.values(data.aisles ?? {})
  ];

  // Destinations must be valid walkable cells
  if (
    !locations.every(
      p =>
        Array.isArray(p) &&
        p.length === 2 &&
        isWalkable(data.grid, p)
    )
  ) {
    throw new Error(
      'Entrance, checkout, and aisle destinations must be walkable cells'
    );
  }

  return data;
}

