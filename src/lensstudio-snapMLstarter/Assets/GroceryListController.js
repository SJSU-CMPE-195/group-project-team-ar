//@input Component.Text groceryText
//@input Asset.InternetModule internetModule
//@input string apiUrl = "http://127.0.0.1:8000/api/lists/demo/items"
//@input bool mockMode = false
//@input Asset.ObjectPrefab itemRowPrefab
//@input SceneObject rowsParent
//@input float rowSpacing = 4

var POLL_INTERVAL_SECONDS = 5;
var requestInProgress = false;
var lastChecklist = "";
var rows = {};
var rowOrder = [];
var pendingIds = {};
var mockItems = [
  { id: 1, name: "Milk", checked: false },
  { id: 2, name: "Eggs", checked: true },
  { id: 3, name: "Bread", checked: false }
];

function displayMessage(message) {
  var textComponent = script.groceryText;
  if (!textComponent) {
    var sceneObject = script.getSceneObject();
    textComponent = sceneObject ? sceneObject.getComponent("Text") : null;
  }
  if (!textComponent) {
    print("GroceryListController: assign the Grocery Text input.");
    return;
  }
  textComponent.text = message;
}

function getInternetModule() {
  var internetModule = script.internetModule;
  if (!internetModule && typeof require === "function") {
    try {
      internetModule = require("LensStudio:InternetModule");
    } catch (moduleError) {
      print("GroceryListController could not load InternetModule: " + moduleError);
    }
  }
  if (!internetModule || typeof internetModule.fetch !== "function") {
    throw new Error("Assign the InternetModule input or enable the built-in InternetModule");
  }
  return internetModule;
}

function formatHeader(items) {
  var completed = items.filter(function(item) { return item.checked === true; }).length;
  var lines = ["Grocery List"];
  if (items.length === 0) {
    lines.push("No items yet.");
  }
  lines.push("");
  lines.push("Progress:");
  lines.push(completed + "/" + items.length + " completed");
  return lines.join("\n");
}

function updateHeader(items) {
  lastChecklist = formatHeader(items);
  displayMessage(lastChecklist);
}

function findPinchRow(rowObject) {
  var components = rowObject.getComponents("Component.ScriptComponent");
  for (var i = 0; i < components.length; i++) {
    if (typeof components[i].setItem === "function") {
      return components[i];
    }
  }
  return null;
}

function createRow(item) {
  if (!script.itemRowPrefab || !script.rowsParent) {
    throw new Error("Assign the Item Row Prefab and Rows Parent inputs");
  }
  var rowObject = script.itemRowPrefab.instantiate(script.rowsParent);
  var pinchRow = findPinchRow(rowObject);
  if (!pinchRow) {
    throw new Error("Item row prefab needs a PinchRow script");
  }
  pinchRow.onToggle = onRowToggled;
  return { object: rowObject, pinchRow: pinchRow };
}

function layoutRows() {
  rowOrder.forEach(function(id, index) {
    rows[id].object.getTransform().setLocalPosition(new vec3(0, -script.rowSpacing * (index + 1), 0));
  });
}

// Keeps the first row just under the header text, however many lines it has
function anchorRowsToHeader() {
  var textComponent = script.groceryText;
  if (!textComponent || !script.rowsParent) {
    return;
  }
  var bottom = textComponent.worldSpaceRect.bottom;
  var position = script.rowsParent.getTransform().getLocalPosition();
  var anchorY = bottom + script.rowSpacing * 0.25;
  if (Math.abs(position.y - anchorY) > 0.01) {
    script.rowsParent.getTransform().setLocalPosition(new vec3(position.x, anchorY, position.z));
  }
}

script.createEvent("UpdateEvent").bind(anchorRowsToHeader);

function syncRows(items) {
  var incoming = {};
  items.forEach(function(item) {
    incoming[item.id] = true;
  });

  rowOrder.forEach(function(id) {
    if (!incoming[id]) {
      rows[id].object.destroy();
      delete rows[id];
    }
  });

  rowOrder = items.map(function(item) {
    var row = rows[item.id];
    if (!row) {
      row = createRow(item);
      rows[item.id] = row;
    }
    // A row with a PATCH in flight keeps its local value so a poll cannot flip it back
    var checked = pendingIds[item.id] ? row.pinchRow.checked : item.checked === true;
    row.pinchRow.setItem(item.id, item.name, checked);
    return item.id;
  });
  layoutRows();
}

function currentItems() {
  return rowOrder.map(function(id) {
    var pinchRow = rows[id].pinchRow;
    return { id: id, name: pinchRow.itemName, checked: pinchRow.checked };
  });
}

function renderChecklist(items) {
  syncRows(items);
  updateHeader(currentItems());
}

function itemUrl(id) {
  return script.apiUrl.replace(/\/lists\/[^\/]+\/items\/?$/, "/items/") + id;
}

async function onRowToggled(pinchRow) {
  var id = pinchRow.itemId;
  var newChecked = pinchRow.checked;
  pendingIds[id] = true;
  updateHeader(currentItems());

  try {
    if (script.mockMode) {
      mockItems.forEach(function(item) {
        if (item.id === id) {
          item.checked = newChecked;
        }
      });
    } else {
      var response = await getInternetModule().fetch(itemUrl(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: newChecked })
      });
      print("GroceryListController PATCH status: " + response.status);
      if (response.status < 200 || response.status >= 300) {
        throw new Error("HTTP " + response.status);
      }
    }
  } catch (error) {
    print("GroceryListController toggle error: " + (error && error.message ? error.message : String(error)));
    pinchRow.setChecked(!newChecked);
  } finally {
    delete pendingIds[id];
    updateHeader(currentItems());
  }
}

function scheduleNextPoll() {
  var event = script.createEvent("DelayedCallbackEvent");
  event.bind(pollChecklist);
  event.reset(POLL_INTERVAL_SECONDS);
}

async function pollChecklist() {
  if (requestInProgress) {
    scheduleNextPoll();
    return;
  }
  requestInProgress = true;

  try {
    if (script.mockMode) {
      renderChecklist(mockItems);
      displayMessage(lastChecklist + "\n(Mock data)");
      return;
    }

    if (!script.apiUrl || script.apiUrl.indexOf("YOUR-NGROK-URL") !== -1) {
      throw new Error("Set apiUrl to the local API or an active HTTPS tunnel");
    }

    var internetModule = getInternetModule();

    var response = await internetModule.fetch(script.apiUrl);
    print("Grocery list API HTTP status: " + response.status);
    if (response.status < 200 || response.status >= 300) {
      throw new Error("HTTP " + response.status);
    }

    var data = await response.json();
    if (!Array.isArray(data.items)) {
      throw new Error("API response is missing the items array");
    }
    renderChecklist(data.items);
  } catch (error) {
    var details = error && error.message ? error.message : String(error);
    print("GroceryListController request error: " + details);
    var previousChecklist = lastChecklist ? lastChecklist + "\n\n" : "Grocery List\n";
    var userMessage = details.indexOf("URL is not secure") !== -1
      ? "Enable Allow Experimental API in Project Settings for local HTTP preview."
      : details;
    displayMessage(previousChecklist + "Update failed: " + userMessage);
  } finally {
    requestInProgress = false;
    scheduleNextPoll();
  }
}

pollChecklist();
