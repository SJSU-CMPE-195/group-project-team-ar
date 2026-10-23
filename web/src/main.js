import { addItem, deleteItem, getItems, updateItem } from "./api.js";
import "./style.css";

const itemInput = document.querySelector("#itemInput");
const addForm = document.querySelector("#addForm");
const addButton = document.querySelector("#addBtn");
const commonItemSelect = document.querySelector("#commonItemSelect");
const itemCount = document.querySelector("#itemCount");
const appStatus = document.querySelector("#appStatus");
const shoppingList = document.querySelector("#shoppingList");
const refreshButton = document.querySelector("#refreshBtn");
const clearCompletedButton = document.querySelector("#clearCompletedBtn");

let items = [];

function setStatus(message, isError = false) {
  appStatus.textContent = message;
  appStatus.classList.toggle("error", isError);
}

function render() {
  shoppingList.replaceChildren();

  for (const item of items) {
    const row = document.createElement("li");
    row.className = "list-item";

    const check = document.createElement("button");
    check.type = "button";
    check.className = `item-check${item.checked ? " checked" : ""}`;
    check.setAttribute("aria-label", `${item.checked ? "Uncheck" : "Check"} ${item.name}`);
    check.setAttribute("aria-pressed", String(item.checked));
    check.addEventListener("click", () => toggleItem(item));

    const name = document.createElement("span");
    name.className = `item-name${item.checked ? " strikethrough" : ""}`;
    name.textContent = item.name;

    const badge = document.createElement("span");
    badge.className = `item-status-badge ${item.checked ? "fulfilled" : "pending"}`;
    badge.textContent = item.checked ? "Completed" : "To get";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "item-delete";
    remove.textContent = "×";
    remove.title = `Delete ${item.name}`;
    remove.setAttribute("aria-label", `Delete ${item.name}`);
    remove.addEventListener("click", () => removeItem(item));

    row.append(check, name, badge, remove);
    shoppingList.append(row);
  }

  const completed = items.filter((item) => item.checked).length;
  itemCount.textContent = `${completed}/${items.length} completed`;
}

async function loadItems() {
  refreshButton.disabled = true;
  try {
    const result = await getItems();
    items = result.items;
    render();
    setStatus("Connected to the checklist API.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    refreshButton.disabled = false;
  }
}

async function submitItem(event) {
  event.preventDefault();
  const name = itemInput.value.trim();
  if (!name) return;

  addButton.disabled = true;
  try {
    const item = await addItem(name);
    items.push(item);
    render();
    itemInput.value = "";
    itemInput.focus();
    setStatus(`${item.name} added.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    addButton.disabled = false;
  }
}

async function toggleItem(item) {
  try {
    const updated = await updateItem(item.id, !item.checked);
    items = items.map((current) => current.id === updated.id ? updated : current);
    render();
    setStatus(`${updated.name} ${updated.checked ? "completed" : "unchecked"}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeItem(item) {
  try {
    await deleteItem(item.id);
    items = items.filter((current) => current.id !== item.id);
    render();
    setStatus(`${item.name} deleted.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeCompletedItems() {
  const completedItems = items.filter((item) => item.checked);
  if (completedItems.length === 0) {
    setStatus("There are no completed items to remove.");
    return;
  }

  clearCompletedButton.disabled = true;
  try {
    await Promise.all(completedItems.map((item) => deleteItem(item.id)));
    const completedIds = new Set(completedItems.map((item) => item.id));
    items = items.filter((item) => !completedIds.has(item.id));
    render();
    setStatus(`${completedItems.length} completed item(s) removed.`);
  } catch (error) {
    await loadItems();
    setStatus(error.message, true);
  } finally {
    clearCompletedButton.disabled = false;
  }
}

addForm.addEventListener("submit", submitItem);
commonItemSelect.addEventListener("change", () => {
  if (!commonItemSelect.value) return;
  itemInput.value = commonItemSelect.value;
  commonItemSelect.selectedIndex = 0;
  itemInput.focus();
});
clearCompletedButton.addEventListener("click", removeCompletedItems);
refreshButton.addEventListener("click", loadItems);
loadItems();
