export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API request failed (${response.status}): ${detail}`);
  }

  return response.status === 204 ? null : response.json();
}

export function getItems(listId = "demo") {
  return request(`/api/lists/${encodeURIComponent(listId)}/items`);
}

export function addItem(name, listId = "demo") {
  return request(`/api/lists/${encodeURIComponent(listId)}/items`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateItem(itemId, checked) {
  return request(`/api/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ checked }),
  });
}

export function deleteItem(itemId) {
  return request(`/api/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}
