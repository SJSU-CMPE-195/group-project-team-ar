const LS_KEY = 'av_items';
const LS_NEXT = 'av_nextId';

let items = [];
let nextId = 1;
let apiOnline = false;

function serverRowToClient(row) {
  return {
    id: row.id,
    name: row.name,
    checked: row.status === 'picked_up',
    detected: false,
  };
}

async function tryHealth() {
  try {
    const r = await fetch('/api/health');
    return r.ok;
  } catch {
    return false;
  }
}

async function loadFromServer() {
  const r = await fetch('/api/items');
  if (!r.ok) throw new Error('failed to load items');
  const rows = await r.json();
  items = rows.map(serverRowToClient);
  nextId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  saveItems();
}

function loadLocalOnly() {
  items = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  nextId = parseInt(localStorage.getItem(LS_NEXT) || '1', 10);
}

function seedDemoItems() {
  ['Milk', 'Eggs', 'Bread'].forEach((name) => {
    items.push({
      id: nextId++,
      name,
      checked: false,
      detected: false,
    });
  });
  localStorage.setItem(LS_NEXT, String(nextId));
}

function renderList() {
  const ul = document.getElementById('shoppingList');
  ul.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'list-item' + (item.detected ? ' detected' : '');
    li.dataset.id = item.id;
    const statusLabel = item.checked ? 'Picked up' : 'Not picked up';
    const statusClass = item.checked ? 'fulfilled' : 'pending';
    li.innerHTML = `
      <div class="item-check ${item.checked ? 'checked' : ''}" data-action="toggle" data-id="${item.id}"></div>
      <span class="item-name ${item.checked ? 'strikethrough' : ''}">${item.name}</span>
      <span class="item-status-badge ${statusClass}">${statusLabel}</span>
      <button type="button" class="item-delete" data-action="delete" data-id="${item.id}" title="Remove">✕</button>
    `;
    ul.appendChild(li);
  });
  ul.querySelectorAll('[data-action="toggle"]').forEach((el) => {
    el.addEventListener('click', () => toggleCheck(Number(el.dataset.id)));
  });
  ul.querySelectorAll('[data-action="delete"]').forEach((el) => {
    el.addEventListener('click', () => deleteItem(Number(el.dataset.id)));
  });
  updateCount();
  saveItems();
}

function updateCount() {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  document.getElementById('itemCount').textContent =
    total === 0 ? '0 items' : `${done}/${total} picked up`;
}

async function addItem() {
  const input = document.getElementById('itemInput');
  const raw = input.value.trim();
  if (!raw) return;
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);

  if (apiOnline) {
    try {
      const r = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error('post failed');
      const row = await r.json();
      items.push(serverRowToClient(row));
      input.value = '';
      renderList();
      return;
    } catch {
      apiOnline = false;
    }
  }

  items.push({ id: nextId++, name, checked: false, detected: false });
  localStorage.setItem(LS_NEXT, String(nextId));
  input.value = '';
  renderList();
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('itemInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });
  document.getElementById('addBtn').addEventListener('click', () => addItem());
  document.getElementById('clearPickedBtn').addEventListener('click', () => clearChecked());
  document.getElementById('refreshBtn').addEventListener('click', () => refreshFromServer());

  apiOnline = await tryHealth();

  if (apiOnline) {
    try {
      await loadFromServer();
    } catch {
      apiOnline = false;
      loadLocalOnly();
    }
  } else {
    loadLocalOnly();
  }

  if (!apiOnline && items.length === 0) {
    seedDemoItems();
  }

  renderList();
});

async function toggleCheck(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const newChecked = !item.checked;
  const status = newChecked ? 'picked_up' : 'not_picked_up';

  if (apiOnline) {
    try {
      const r = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error('patch failed');
    } catch {
      /* keep UI in sync locally even if request fails */
    }
  }

  item.checked = newChecked;
  renderList();
}

async function deleteItem(id) {
  if (apiOnline) {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
    } catch {
      /* still remove from UI */
    }
  }
  items = items.filter((i) => i.id !== id);
  renderList();
}

async function clearChecked() {
  const toRemove = items.filter((i) => i.checked);
  if (apiOnline) {
    for (const i of toRemove) {
      try {
        await fetch(`/api/items/${i.id}`, { method: 'DELETE' });
      } catch {
        /* continue */
      }
    }
  }
  items = items.filter((i) => !i.checked);
  renderList();
}

async function refreshFromServer() {
  if (!apiOnline) return;
  try {
    await loadFromServer();
    renderList();
  } catch {
    apiOnline = false;
  }
}

function saveItems() {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

window.appItems = () => items;
window.markDetected = async (name) => {
  const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
  if (item && !item.checked) {
    item.detected = true;
    item.checked = true;
    if (apiOnline) {
      try {
        await fetch(`/api/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'picked_up' }),
        });
      } catch {
        /* ignore */
      }
    }
    renderList();
  }
};

window.addItem = addItem;
window.toggleCheck = toggleCheck;
window.deleteItem = deleteItem;
window.clearChecked = clearChecked;
window.refreshFromServer = refreshFromServer;
