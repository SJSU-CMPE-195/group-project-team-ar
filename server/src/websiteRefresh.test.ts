import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../web/js/app.js', import.meta.url), 'utf8');

for (const action of ['addItem()', 'toggleCheck(1)', 'toggleCheck(2)', 'deleteItem(1)', 'clearChecked()']) {
  test(`Node website refreshes server order after ${action}`, async () => {
    const requests: string[] = [];
    const rows = [
      { id: 1, name: 'Microwave', aisle: 'D74', status: 'not_picked_up' },
      { id: 2, name: 'Fork', aisle: 'E73', status: 'picked_up' },
    ];
    const context = vm.createContext({
      window: {},
      document: { addEventListener() {}, getElementById: () => ({ value: 'Fork' }) },
      localStorage: { setItem() {} },
      alert: (message: string) => assert.fail(message),
      fetch: async (url: string, options?: { method: string }) => {
        requests.push(`${options?.method ?? 'GET'} ${url}`);
        return { ok: true, json: async () => rows };
      },
    });
    vm.runInContext(source, context);
    vm.runInContext(`apiOnline = true; items = ${JSON.stringify(rows)}.map(serverRowToClient); renderList = () => {};`, context);
    await vm.runInContext(action, context);
    assert.equal(requests.length, 2);
    assert.equal(requests[1], 'GET /api/items');
    assert.equal(vm.runInContext('JSON.stringify(items.map(item => item.id))', context), '[1,2]');
  });
}
