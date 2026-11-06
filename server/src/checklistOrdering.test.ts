import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GroceryRow } from './db.js';
import { orderChecklist } from './checklistOrdering.js';
import { loadStoreMap } from './pathfinding/storeMap.js';
import { planRoute } from './pathfinding/routePlanner.js';

const row = (id: number, aisle: string | null, done = false): GroceryRow => ({
  id, name: `item ${id}`, aisle, status: done ? 'picked_up' : 'not_picked_up',
});
const ids = (items: GroceryRow[]) => items.map(item => item.id);

test('demo route determines order and preserves every field without mutation', () => {
  const input = [row(1, 'D74'), row(2, 'E73'), row(3, 'B49')];
  const before = structuredClone(input);
  input.forEach(Object.freeze);
  Object.freeze(input);
  const expected = planRoute(loadStoreMap(), input.map(item => item.aisle!))!;
  const result = orderChecklist(input);
  assert.deepEqual(result.map(item => item.aisle), expected.visitOrder);
  assert.deepEqual(input, before);
  assert.deepEqual([...result].sort((a, b) => a.id - b.id), before);
  result.forEach(item => assert.equal(item, input.find(original => original.id === item.id)));
});

test('duplicate and case variant aisles remain together and reach planner once', () => {
  const input = [row(1, 'D74'), row(2, ' e73 '), row(3, 'D74'), row(4, 'E73')];
  const result = orderChecklist(input, loadStoreMap, (map, aisles) => {
    assert.deepEqual(aisles, ['D74', 'E73']);
    return planRoute(map, aisles);
  });
  assert.deepEqual(ids(result), [2, 4, 1, 3]);
});

test('unknown, null, blank and unsupported aisles follow routed items; completed last', () => {
  const input = [row(1, 'B9'), row(2, 'D74', true), row(3, null),
    row(4, 'E73'), row(5, ''), row(6, 'B9'), row(7, null, true)];
  assert.deepEqual(ids(orderChecklist(input)), [4, 1, 6, 3, 5, 2, 7]);
  assert.equal(input[0].aisle, 'B9');
});

test('empty, completed-only and unknown-only lists are safe', () => {
  assert.deepEqual(orderChecklist([]), []);
  for (const input of [[row(1, null, true)], [row(1, 'B9'), row(2, null)]]) {
    assert.deepEqual(orderChecklist(input), input);
  }
});

test('null, thrown, malformed and over-limit routes preserve all items in stable groups', () => {
  const input = [row(1, null), row(2, 'D74'), row(3, 'E73'), row(4, 'D74'), row(5, 'E73', true)];
  for (const planner of [
    () => null,
    () => { throw new Error('Demo planner supports up to 8 aisles'); },
    () => ({ visitOrder: ['D74', 'D74'], path: [], totalSteps: 0 }),
  ]) {
    assert.deepEqual(ids(orderChecklist(input, loadStoreMap, planner)), [2, 4, 3, 1, 5]);
  }
  assert.deepEqual(ids(orderChecklist(input, () => { throw new Error('map unavailable'); })), [1, 2, 4, 3, 5]);
});

test('unreachable mapped aisle follows reachable aisles', () => {
  const map = loadStoreMap();
  // Isolate the existing D74 destination in a test copy of the demo grid.
  map.grid[0][7] = 1;
  map.grid[1][8] = 1;
  assert.deepEqual(ids(orderChecklist([row(1, 'D74'), row(2, 'E73')], () => map)), [2, 1]);
});
