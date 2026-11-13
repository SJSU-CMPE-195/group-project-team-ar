const LS_KEY = 'av_items';
const LS_NEXT = 'av_nextId';

let items = [];
let nextId = 1;
let apiOnline = false;

const AISLES_BY_ITEM = {
  'cup': 'E80',
  'bottle': 'Q19',
  'microwave': 'D74',
  'potted plant': 'B5',
  'keyboard': 'D36',
  'backpack': 'P26',
  'umbrella': 'UT50',
  'handbag': 'AC50',
  'tie': 'MN50',
  'suitcase': 'D49',
  'sports ball': 'Q21',
  'baseball bat': 'Q21',
  'baseball glove': 'Q21',
  'tennis racket': 'Q19',
  'wine glass': 'E66',
  'fork': 'E73',
  'knife': 'E60',
  'spoon': 'E73',
  'bowl': 'E80',
  'banana': 'B49',
  'apple': 'B50',
  'sandwich': 'B43',
  'orange': 'B49',
  'broccoli': 'B57',
  'carrot': 'B57',
  'hot dog': 'B48',
  'pizza': 'B42',
  'donut': 'B31',
  'cake': 'B39',
  'chair': 'E83',
  'tv': 'D69',
  'laptop': 'D27',
  'mouse': 'D36',
  'remote': 'D69',
  'toaster': 'D73',
  'book': 'D48',
  'clock': 'E83',
  'vase': 'E10',
  'scissors': 'A23',
  'teddy bear': 'P24',
  'hair drier': 'C20',
  'toothbrush': 'C27',
};

function aisleForItem(name) {
  const key = name.trim().toLowerCase();
  return Object.hasOwn(AISLES_BY_ITEM, key) ? AISLES_BY_ITEM[key] : null;
}

function serverRowToClient(row) {
  return {
    id: row.id,
    name: row.name,
    aisle: aisleForItem(row.name) ?? row.aisle,
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
  items = JSON.parse(localStorage.getItem(LS_KEY) || '[]').map((item) => ({
    ...item,
    aisle: aisleForItem(item.name) ?? item.aisle,
  }));
  nextId = parseInt(localStorage.getItem(LS_NEXT) || '1', 10);
}

function seedDemoItems() {
  ['Milk', 'Eggs', 'Bread'].forEach((name) => {
    items.push({
      id: nextId++,
      name,
      aisle: aisleForItem(name),
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
    const aisleLabel = item.aisle || 'N/A';
    li.innerHTML = `
      <div class="item-check ${item.checked ? 'checked' : ''}" data-action="toggle" data-id="${item.id}"></div>
      <span class="item-name ${item.checked ? 'strikethrough' : ''}">${item.name}</span>
      <span class="item-aisle">Aisle ${aisleLabel}</span>
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
      await loadFromServer();
      input.value = '';
      renderList();
      return;
    } catch {
      alert('Could not add or refresh the checklist. Refresh before retrying.');
      return;
    }
  }

  items.push({ id: nextId++, name, aisle: aisleForItem(name), checked: false, detected: false });
  localStorage.setItem(LS_NEXT, String(nextId));
  input.value = '';
  renderList();
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('commonItemSelect').addEventListener('change', (e) => {
    const sel = e.target;
    const v = sel.value;
    if (!v) return;
    document.getElementById('itemInput').value = v;
    sel.selectedIndex = 0;
    document.getElementById('itemInput').focus();
  });

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
      await loadFromServer();
      renderList();
      return;
    } catch {
      alert('Could not update or refresh the checklist. Refresh before retrying.');
      return;
    }
  }

  item.checked = newChecked;
  renderList();
}

async function deleteItem(id) {
  if (apiOnline) {
    try {
      const r = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('delete failed');
      await loadFromServer();
      renderList();
      return;
    } catch {
      alert('Could not delete or refresh the checklist. Refresh before retrying.');
      return;
    }
  }
  items = items.filter((i) => i.id !== id);
  renderList();
}

async function clearChecked() {
  const toRemove = items.filter((i) => i.checked);
  if (apiOnline) {
    try {
      for (const i of toRemove) {
        const r = await fetch(`/api/items/${i.id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error('delete failed');
      }
    } catch {
      alert('Some items could not be removed. Refreshing the checklist.');
    }
    await refreshFromServer();
    return;
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
