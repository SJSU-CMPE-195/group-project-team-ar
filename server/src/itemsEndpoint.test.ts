import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { orderChecklist } from './checklistOrdering.js';

test('GET /api/items passes database rows through ordering and keeps the array contract', async () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
  const handlerSource = source.slice(source.indexOf("app.get('/api/items'"), source.indexOf("app.post('/api/items'"));
  const rows = [
    { id: 1, name: 'Microwave', aisle: 'D74', status: 'not_picked_up' as const },
    { id: 2, name: 'Fork', aisle: 'E73', status: 'not_picked_up' as const },
    { id: 3, name: 'Banana', aisle: 'B49', status: 'picked_up' as const },
  ];
  let handler: (req: unknown, res: unknown) => Promise<void> = async () => assert.fail('route not registered');
  vm.runInNewContext(handlerSource, {
    app: { get: (path: string, callback: typeof handler) => {
      assert.equal(path, '/api/items');
      handler = callback;
    } },
    listItems: async () => rows,
    orderChecklist,
  });
  let payload: unknown;
  await handler({}, { json: (value: unknown) => { payload = value; } });
  assert.deepEqual(payload, [rows[1], rows[0], rows[2]]);
  assert.equal(JSON.stringify(payload), JSON.stringify([rows[1], rows[0], rows[2]]));
});
