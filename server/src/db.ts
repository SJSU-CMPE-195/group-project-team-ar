import mysql from 'mysql2/promise';

export type ItemStatus = 'not_picked_up' | 'picked_up';

export type GroceryRow = {
  id: number;
  name: string;
  aisle: string | null;
  status: ItemStatus;
};

const AISLES_BY_ITEM: Record<string, string> = {
  banana: 'B9',
  bottle: 'B68',
  fork: 'E73',
  scissors: 'A23',
  'potted plant': 'E28',
  keyboard: 'D36',
  cup: 'E67',
  microwave: 'D74',
};

function aisleForItem(name: string): string | null {
  return AISLES_BY_ITEM[name.trim().toLowerCase()] ?? null;
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'aislevision',
  waitForConnections: true,
  connectionLimit: 10,
});

function toRow(r: mysql.RowDataPacket): GroceryRow {
  return {
    id: Number(r.id),
    name: String(r.name),
    aisle: r.aisle === null || r.aisle === undefined ? null : String(r.aisle),
    status: r.status as ItemStatus,
  };
}

/** Creates the table if it does not exist (database must already exist). */
export async function ensureSchema(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      aisle VARCHAR(16) NULL,
      status ENUM('not_picked_up', 'picked_up') NOT NULL DEFAULT 'not_picked_up',
      PRIMARY KEY (id),
      KEY idx_grocery_items_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function pingDb(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function listItems(): Promise<GroceryRow[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, name, aisle, status FROM grocery_items ORDER BY id ASC'
  );
  return rows.map(toRow);
}

export async function insertItem(
  name: string,
  status: ItemStatus = 'not_picked_up'
): Promise<GroceryRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('name required');
  const aisle = aisleForItem(trimmed);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO grocery_items (name, aisle, status) VALUES (?, ?, ?)',
    [trimmed, aisle, status]
  );
  const id = result.insertId;
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, name, aisle, status FROM grocery_items WHERE id = ?',
    [id]
  );
  const r = rows[0];
  if (!r) throw new Error('insert failed');
  return toRow(r);
}

export async function updateItemStatus(
  id: number,
  status: ItemStatus
): Promise<GroceryRow | undefined> {
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    'UPDATE grocery_items SET status = ? WHERE id = ?',
    [status, id]
  );
  if (res.affectedRows === 0) return undefined;
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, name, aisle, status FROM grocery_items WHERE id = ?',
    [id]
  );
  const r = rows[0];
  return r ? toRow(r) : undefined;
}

export async function deleteItem(id: number): Promise<boolean> {
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    'DELETE FROM grocery_items WHERE id = ?',
    [id]
  );
  return res.affectedRows > 0;
}
