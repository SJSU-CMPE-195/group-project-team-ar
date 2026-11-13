import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import mysql from 'mysql2/promise';
import { AISLES_BY_ITEM, aisleForItem, aisleMigrationSql, aisleMigrationParams } from './aisleMappings.js';
import { orderChecklist } from './checklistOrdering.js';

const expected = Object.fromEntries(`Cup:E80,Bottle:Q19,Microwave:D74,Potted plant:B5,Keyboard:D36,Backpack:P26,Umbrella:UT50,Handbag:AC50,Tie:MN50,Suitcase:D49,Sports ball:Q21,Baseball bat:Q21,Baseball glove:Q21,Tennis racket:Q19,Wine glass:E66,Fork:E73,Knife:E60,Spoon:E73,Bowl:E80,Banana:B49,Apple:B50,Sandwich:B43,Orange:B49,Broccoli:B57,Carrot:B57,Hot dog:B48,Pizza:B42,Donut:B31,Cake:B39,Chair:E83,TV:D69,Laptop:D27,Mouse:D36,Remote:D69,Toaster:D73,Book:D48,Clock:E83,Vase:E10,Scissors:A23,Teddy bear:P24,Hair drier:C20,Toothbrush:C27`.split(',').map(pair => pair.split(':')));
const source = readFileSync(new URL('../../web/js/app.js', import.meta.url), 'utf8');

test('all 42 dropdown items have exact backend and browser aisle mappings', () => {
  const html = readFileSync(new URL('../../web/app.html', import.meta.url), 'utf8');
  const names = [...html.matchAll(/<option value="([^"]+)">/g)].map(match => match[1]);
  assert.equal(names.length, 42);
  assert.deepEqual(names.map(name => name.toLowerCase()), Object.keys(expected).map(name => name.toLowerCase()));
  assert.equal(Object.keys(AISLES_BY_ITEM).length, 42);
  const browser = vm.createContext({ window: {}, document: { addEventListener() {} } });
  vm.runInContext(source, browser);
  for (const [name, aisle] of Object.entries(expected)) {
    assert.equal(aisleForItem(` ${name.toUpperCase()} `), aisle);
    assert.equal(vm.runInContext(`aisleForItem(${JSON.stringify(name)})`, browser), aisle);
  }
  for (const name of ['Unknown', 'Frisbee', 'Kite', 'Skateboard', 'Cell phone', '__proto__', 'constructor']) {
    assert.equal(aisleForItem(name), null);
    assert.equal(vm.runInContext(`aisleForItem(${JSON.stringify(name)})`, browser), null);
  }
});

for (const online of [false, true]) {
  test(`website adds all 42 aisles and supports check/uncheck/delete/refresh (${online ? 'API' : 'offline'})`, async () => {
    type Element = { value: string; innerHTML: string; textContent: string; selectedIndex: number; dataset: Record<string, unknown>; children: Element[]; listeners: Record<string, (event?: unknown) => unknown>; addEventListener(type: string, fn: (event?: unknown) => unknown): void; focus(): void; appendChild(child: Element): void; querySelectorAll(): never[] };
    const elements = new Map<string, Element>();
    const makeElement = (): Element => ({ value: '', innerHTML: '', textContent: '', selectedIndex: 0, dataset: {}, children: [], listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, focus() {}, appendChild(child) { this.children.push(child); }, querySelectorAll() { return []; } });
    const element = (id: string) => { if (!elements.has(id)) elements.set(id, makeElement()); return elements.get(id)!; };
    let ready: () => Promise<void> = async () => {};
    let rows = [{ id: 1, name: 'Banana', aisle: 'B49', status: 'not_picked_up' }];
    let nextId = 2;
    const storage = new Map([['av_items', JSON.stringify([{ id: 1, name: 'Banana', aisle: 'B9', checked: false, detected: false }])], ['av_nextId', '2']]);
    const context = vm.createContext({
      window: {}, document: { addEventListener: (_: string, fn: typeof ready) => { ready = fn; }, getElementById: element, createElement: makeElement },
      localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
      alert: (message: string) => assert.fail(message),
      fetch: async (url: string, options?: { method?: string; body?: string }) => {
        const body = JSON.parse(options?.body ?? '{}');
        const id = Number(url.split('/').at(-1));
        if (options?.method === 'POST') rows.push({ id: nextId++, name: body.name, aisle: aisleForItem(body.name)!, status: 'not_picked_up' });
        if (options?.method === 'PATCH') rows.find(row => row.id === id)!.status = body.status;
        if (options?.method === 'DELETE') rows = rows.filter(row => row.id !== id);
        return { ok: online, json: async () => orderChecklist(rows as Parameters<typeof orderChecklist>[0]) };
      },
    });
    vm.runInContext(source, context);
    await ready();
    assert.equal(vm.runInContext('items[0].aisle', context), 'B49', 'old local Banana aisle is corrected');
    for (const [name, aisle] of Object.entries(expected)) {
      element('commonItemSelect').value = name;
      element('commonItemSelect').listeners.change({ target: element('commonItemSelect') });
      assert.equal(element('itemInput').value, name);
      assert.equal(element('commonItemSelect').selectedIndex, 0);
      await vm.runInContext('addItem()', context);
      assert.equal(element('itemInput').value, '');
      assert.equal(vm.runInContext(`items.findLast(item => item.name === ${JSON.stringify(name)}).aisle`, context), aisle);
      assert.ok(element('shoppingList').children.some(child => child.innerHTML.includes(`Aisle ${aisle}`)));
    }
    assert.equal(vm.runInContext('items.length', context), 43);
    await vm.runInContext('toggleCheck(1)', context);
    assert.equal(vm.runInContext('items.find(item => item.id === 1).checked', context), true);
    if (online) assert.equal(vm.runInContext('items.at(-1).id', context), 1);
    await vm.runInContext('toggleCheck(1)', context);
    assert.equal(vm.runInContext('items.find(item => item.id === 1).checked', context), false);
    await vm.runInContext('deleteItem(1)', context);
    await vm.runInContext('refreshFromServer()', context);
    assert.equal(vm.runInContext('items.some(item => item.id === 1)', context), false);
    assert.equal(vm.runInContext('items.length', context), 42);
    await vm.runInContext('toggleCheck(2);', context);
    await vm.runInContext('clearChecked()', context);
    assert.equal(vm.runInContext('items.length', context), 41);
  });
}

test('MySQL migration corrects all 42 items, preserves other columns and is repeatable', { skip: !process.env.TEST_MYSQL_AISLES }, async () => {
  const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT) || 3306, user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? '', database: process.env.MYSQL_DATABASE ?? 'aislevision' });
  try {
    // A connection-local temporary table shadows the real table, leaving customer records untouched.
    await connection.execute("CREATE TEMPORARY TABLE grocery_items (id INT PRIMARY KEY, name VARCHAR(255), aisle VARCHAR(16), status VARCHAR(32), extra_data VARCHAR(255))");
    let id = 0;
    for (const name of [...Object.keys(expected), 'Unknown', 'Frisbee']) {
      await connection.execute('INSERT INTO grocery_items VALUES (?, ?, ?, ?, ?)', [++id, ` ${name.toUpperCase()} `, id % 2 ? 'OLD' : null, id % 2 ? 'picked_up' : 'not_picked_up', `preserve-${id}`]);
    }
    const [before] = await connection.query<mysql.RowDataPacket[]>('SELECT * FROM grocery_items ORDER BY id');
    await connection.execute(aisleMigrationSql, aisleMigrationParams);
    const [after] = await connection.query<mysql.RowDataPacket[]>('SELECT * FROM grocery_items ORDER BY id');
    assert.deepEqual(after, before.map(row => ({ ...row, aisle: aisleForItem(row.name) ?? row.aisle })));
    const [repeat] = await connection.execute<mysql.ResultSetHeader>(aisleMigrationSql, aisleMigrationParams);
    assert.equal(repeat.affectedRows, 0);
  } finally {
    await connection.end();
  }
});
