
/**
 * AisleVision - Pathfinding Tests
 */

import assert from 'node:assert/strict';

import { findPath } from './astar.js';
import { planRoute } from './routePlanner.js';
import { loadStoreMap } from './storeMap.js';

// Load our demo grocery store
const map = loadStoreMap();

// ----------------------------------------
// TEST 1: Find a path to aisle E73
// ----------------------------------------

const path = findPath(
  map.grid,
  map.entrance,
  map.aisles.E73
);

assert.ok(
  path,
  'Path to E73 should exist'
);

assert.deepEqual(
  path[0],
  map.entrance
);

assert.deepEqual(
  path[path.length - 1],
  map.aisles.E73
);

console.log('Test 1 passed: Route found');

// ----------------------------------------
// TEST 2: Never walk through obstacles
// ----------------------------------------

for (let i = 0; i < path.length; i++) {

  const [x, y] = path[i];

  assert.equal(
    map.grid[y][x],
    0,
    'A path cannot cross a shelf'
  );

  // Every consecutive step must be adjacent
  if (i > 0) {

    const previous = path[i - 1];

    const distance =
      Math.abs(x - previous[0]) +
      Math.abs(y - previous[1]);

    assert.equal(distance, 1);
  }
}

console.log('Test 2 passed: No obstacles crossed');

// ----------------------------------------
// TEST 3: Unreachable destination
// ----------------------------------------

assert.equal(
  findPath(
    [
      [0, 1],
      [1, 0]
    ],
    [0, 0],
    [1, 1]
  ),
  null
);

console.log('Test 3 passed: Blocked route handled');

// ----------------------------------------
// TEST 4: Start equals goal
// ----------------------------------------

assert.deepEqual(
  findPath(
    [[0]],
    [0, 0],
    [0, 0]
  ),
  [[0, 0]]
);

console.log('Test 4 passed: Same start and goal');

// ----------------------------------------
// TEST 5: Blocked starting cell
// ----------------------------------------

assert.equal(
  findPath(
    [[1]],
    [0, 0],
    [0, 0]
  ),
  null
);

console.log('Test 5 passed: Invalid start handled');

// ----------------------------------------
// TEST 6: Multi-item shopping route
// ----------------------------------------

const route = planRoute(
  map,
  ['E73', 'D74', 'B49'],
  map.entrance,
  true
);

assert.ok(
  route,
  'A multi-item route should exist'
);

// All 3 aisles must be visited
assert.equal(route.visitOrder.length, 3);

assert.equal(
  new Set(route.visitOrder).size,
  3
);

// Start at entrance
assert.deepEqual(
  route.path[0],
  map.entrance
);

// End at checkout
assert.deepEqual(
  route.path[route.path.length - 1],
  map.checkout
);

// Make sure every requested aisle is visited
for (const id of route.visitOrder) {

  const destination = map.aisles[id];

  assert.ok(
    route.path.some(
      point =>
        point[0] === destination[0] &&
        point[1] === destination[1]
    )
  );
}

console.log('Test 6 passed: Multi-item navigation');

console.log('\nAll pathfinding tests passed!');
console.log('\nFinal planned route:');
console.log(JSON.stringify(route, null, 2));

