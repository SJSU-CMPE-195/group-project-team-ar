import 'dotenv/config';
import assert from 'node:assert/strict';
import { aisleForItem } from './aisleMappings.js';
import { closeDb, listItems, migrateAisles } from './db.js';

try {
  const before = await listItems();
  const outdated = before.filter(row => aisleForItem(row.name) !== null && row.aisle !== aisleForItem(row.name));
  console.log(`Inspected ${before.length} records; ${outdated.length} have outdated aisle mappings.`);
  await migrateAisles();
  const after = await listItems();
  assert.deepEqual(after, before.map(row => ({ ...row, aisle: aisleForItem(row.name) ?? row.aisle })));
  assert.equal(await migrateAisles(), 0, 'Repeated migration must leave all records unchanged');
  console.log('Verified updated aisles, preserved IDs/names/status, and repeatability.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await closeDb();
}
