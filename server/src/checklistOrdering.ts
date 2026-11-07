import type { GroceryRow } from './db.js';
import { findPath } from './pathfinding/astar.js';
import { planRoute } from './pathfinding/routePlanner.js';
import { loadStoreMap } from './pathfinding/storeMap.js';

/** Reorder references only; never change or persist item fields. */
export function orderChecklist(
  items: readonly GroceryRow[],
  loadMap = loadStoreMap,
  planner = planRoute,
): GroceryRow[] {
  const completed = items.filter(item => item.status === 'picked_up');
  const groups = new Map<string, GroceryRow[]>();
  for (const item of items) {
    if (item.status === 'picked_up') continue;
    const key = item.aisle?.trim().toUpperCase() ?? '';
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  let order = [...groups.keys()];
  try {
    const map = loadMap();
    const routable = order.filter(id => Object.hasOwn(map.aisles, id)
      && findPath(map.grid, map.entrance, map.aisles[id]) !== null);
    const unsupported = order.filter(id => !routable.includes(id));
    // Keep supported groups ahead of unsupported ones even if planning fails.
    order = [...routable, ...unsupported];
    if (routable.length > 0) {
      const route = planner(map, routable);
      if (route && route.visitOrder.length === routable.length
        && new Set(route.visitOrder).size === routable.length
        && route.visitOrder.every(id => routable.includes(id))) {
        order = [...route.visitOrder, ...unsupported];
      }
    }
  } catch (error) {
    console.warn('Checklist routing unavailable; using stable aisle groups:', error);
  }
  return [...order.flatMap(id => groups.get(id)!), ...completed];
}
