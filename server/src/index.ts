import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteItem,
  ensureSchema,
  insertItem,
  listItems,
  pingDb,
  type ItemStatus,
  updateItemStatus,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..', '..', 'web');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pingDb();
    res.json({ ok: true, service: 'aislevision', db: 'mysql' });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

app.get('/api/items', async (_req, res) => {
  try {
    res.json(await listItems());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    let status: ItemStatus = 'not_picked_up';
    if (req.body?.status === 'picked_up' || req.body?.status === 'not_picked_up') {
      status = req.body.status;
    }
    const row = await insertItem(name, status);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

app.patch('/api/items/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  const status = req.body?.status;
  if (status !== 'picked_up' && status !== 'not_picked_up') {
    res.status(400).json({ error: 'status must be picked_up or not_picked_up' });
    return;
  }
  const row = await updateItemStatus(id, status);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(row);
});

app.delete('/api/items/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  const ok = await deleteItem(id);
  if (!ok) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.status(204).send();
});

app.use(express.static(webRoot));

async function main() {
  try {
    await ensureSchema();
  } catch (e) {
    console.error('\nCould not connect to MySQL or create tables.');
    console.error('1) Install MySQL Server and start the service.');
    console.error('2) Create database `aislevision` (run server/mysql/workbench_setup.sql in Workbench).');
    console.error('3) Copy server/.env.example to server/.env and set MYSQL_PASSWORD.\n');
    console.error(e);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`AisleVision server http://localhost:${PORT}`);
    console.log(`Web app: http://localhost:${PORT}/app.html`);
    console.log(`MySQL: ${process.env.MYSQL_DATABASE ?? 'aislevision'} @ ${process.env.MYSQL_HOST ?? '127.0.0.1'}`);
  });
}

main();
