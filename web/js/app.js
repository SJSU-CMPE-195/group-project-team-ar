const CATEGORY_MAP = {
  milk: 'dairy', cheese: 'dairy', yogurt: 'dairy', butter: 'dairy', cream: 'dairy', eggs: 'other',
  apple: 'produce', apples: 'produce', banana: 'produce', bananas: 'produce',
  orange: 'produce', oranges: 'produce', lettuce: 'produce', tomato: 'produce',
  tomatoes: 'produce', spinach: 'produce', berries: 'produce', grapes: 'produce',
  bread: 'bakery', bagel: 'bakery', muffin: 'bakery', croissant: 'bakery',
  chicken: 'meat', beef: 'meat', pork: 'meat', steak: 'meat', salmon: 'meat', fish: 'meat', turkey: 'meat',
};

let items = JSON.parse(localStorage.getItem('av_items') || '[]');
let activeFilter = 'all';
let nextId = parseInt(localStorage.getItem('av_nextId') || '1');

function renderList() {
  const ul = document.getElementById('shoppingList');
  ul.innerHTML = '';
  const visible = items.filter(i => activeFilter === 'all' || i.category === activeFilter);
  visible.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-item' + (item.detected ? ' detected' : '');
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="item-check ${item.checked ? 'checked' : ''}" onclick="toggleCheck(${item.id})"></div>
      <span class="item-name ${item.checked ? 'strikethrough' : ''}">${item.name}</span>
      <span class="item-cat-tag">${item.category}</span>
      <button class="item-delete" onclick="deleteItem(${item.id})" title="Remove">✕</button>
    `;
    ul.appendChild(li);
  });
  updateCount();
  saveItems();
  updateHudList();
}

function updateCount() {
  const total = items.length;
  const done  = items.filter(i => i.checked).length;
  document.getElementById('itemCount').textContent =
    total === 0 ? '0 items' : `${done}/${total} done`;
}

function addItem() {
  const input = document.getElementById('itemInput');
  const raw = input.value.trim();
  if (!raw) return;
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  const category = CATEGORY_MAP[raw.toLowerCase()] || 'other';
  items.push({ id: nextId++, name, category, checked: false, detected: false });
  localStorage.setItem('av_nextId', nextId);
  input.value = '';
  renderList();
  flashSyncStatus();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('itemInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
  if (items.length === 0) {
    ['Milk','Eggs','Bread','Apples','Butter','Chicken'].forEach(name => {
      items.push({ id: nextId++, name, category: CATEGORY_MAP[name.toLowerCase()] || 'other', checked: false, detected: false });
    });
    localStorage.setItem('av_nextId', nextId);
  }
  renderList();
});

function toggleCheck(id) {
  const item = items.find(i => i.id === id);
  if (item) { item.checked = !item.checked; renderList(); }
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  renderList();
}

function clearChecked() {
  items = items.filter(i => !i.checked);
  renderList();
}

function filterCategory(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function syncToGlasses() {
  const statusEl = document.getElementById('syncStatus');
  statusEl.innerHTML = `<span class="sync-dot active"></span> Syncing…`;
  setTimeout(() => {
    statusEl.innerHTML = `<span class="sync-dot" style="background:var(--green);box-shadow:0 0 6px var(--green)"></span> Synced ✓`;
    setTimeout(() => {
      statusEl.innerHTML = `<span class="sync-dot"></span> Ready to sync`;
    }, 2500);
  }, 1200);
}

function flashSyncStatus() {
  document.getElementById('syncStatus').innerHTML = `<span class="sync-dot"></span> Unsaved changes`;
}

function updateHudList() {
  const container = document.getElementById('hudListItems');
  if (!container) return;
  container.innerHTML = '';
  items.slice(0, 6).forEach(item => {
    const div = document.createElement('div');
    div.className = 'hud-cl-item' + (item.checked ? ' done' : '');
    div.textContent = (item.checked ? '✓ ' : '○ ') + item.name;
    container.appendChild(div);
  });
}

function saveItems() { localStorage.setItem('av_items', JSON.stringify(items)); }

window.appItems = () => items;
window.markDetected = (name) => {
  const item = items.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (item && !item.checked) { item.detected = true; item.checked = true; renderList(); }
};
