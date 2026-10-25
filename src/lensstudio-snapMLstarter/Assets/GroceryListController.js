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
var progressWidgets = null;
var completedCount = 0;
var totalCount = 0;
var lastDebugKey = "";
var BAR_CORNER_RADIUS = 0.5;
var BAR_TRACK_COLOR = new vec4(1, 1, 1, 0.25);
var BAR_FILL_COLOR = new vec4(0.15, 0.65, 0.25, 0.6);
var BAR_HEIGHT_FACTOR = 0.35;
var BAR_TEXT_SCALE = 0.3;
var BAR_GAP = 0.5;
var mockItems = [
  { id: 1, name: "Milk", checked: false },
  { id: 2, name: "Eggs", checked: true },
  { id: 3, name: "Bread", checked: false }
];

function displayMessage(message) {
  var textComponent = getGroceryText();
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
  var lines = ["Grocery List"];
  if (items.length === 0) {
    lines.push("No items yet.");
  }
  lines.push("");
  lines.push("Progress:");
  return lines.join("\n");
}

function getGroceryText() {
  var textComponent = script.groceryText;
  if (!textComponent) {
    var sceneObject = script.getSceneObject();
    textComponent = sceneObject ? sceneObject.getComponent("Text") : null;
  }
  return textComponent;
}

function createHeaderText(name, baseText) {
  var textObject = global.scene.createSceneObject(name);
  textObject.setParent(script.getSceneObject());
  var text = textObject.createComponent("Component.Text");
  text.size = baseText.size;
  text.depthTest = baseText.depthTest;
  text.horizontalAlignment = baseText.horizontalAlignment;
  text.verticalAlignment = baseText.verticalAlignment;
  text.textFill.color = baseText.textFill.color;
  if (baseText.font) {
    text.font = baseText.font;
  }
  text.renderOrder = baseText.renderOrder;
  return text;
}

function styleBar(text, color) {
  // A real glyph with a clear fill: the background only draws when the text has something to lay out
  text.text = "I";
  text.textFill.color = new vec4(0, 0, 0, 0);
  text.backgroundSettings.margins = Rect.create(0, 0, 0, 0);
  text.backgroundSettings.enabled = true;
  text.backgroundSettings.cornerRadius = BAR_CORNER_RADIUS;
  text.backgroundSettings.fill.color = color;
}

// Progress bar: a translucent track, a green fill, and the "n/m completed" text under it
function ensureProgressWidgets() {
  if (progressWidgets) {
    return progressWidgets;
  }
  var baseText = getGroceryText();
  if (!baseText) {
    return null;
  }
  progressWidgets = {
    count: createHeaderText("ProgressCount", baseText),
    track: createHeaderText("ProgressTrack", baseText),
    fill: createHeaderText("ProgressFill", baseText),
    baseWidth: 0,
    baseHeight: 0,
    framesUntilMeasured: 3
  };
  styleBar(progressWidgets.track, BAR_TRACK_COLOR);
  styleBar(progressWidgets.fill, BAR_FILL_COLOR);
  // A small font keeps the bar's glyph short, so the bar can be thin
  progressWidgets.track.size = baseText.size * BAR_TEXT_SCALE;
  progressWidgets.fill.size = baseText.size * BAR_TEXT_SCALE;
  progressWidgets.track.renderOrder = baseText.renderOrder + 1;
  progressWidgets.fill.renderOrder = baseText.renderOrder + 2;
  return progressWidgets;
}

function setProgress(items) {
  completedCount = items.filter(function(item) { return item.checked === true; }).length;
  totalCount = items.length;
  var widgets = ensureProgressWidgets();
  if (widgets) {
    var percent = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
    widgets.count.text = completedCount + "/" + totalCount + " completed (" + percent + "%)";
  }
}

function updateHeader(items) {
  setProgress(items);
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

// Stacks header text, progress bar, count text and rows top to bottom, however tall each one is
function layoutHeader() {
  var baseText = getGroceryText();
  var widgets = progressWidgets;
  if (!baseText || !widgets || !script.rowsParent) {
    return;
  }

  // Wait a few frames with zero margins so the layout size of the bar text can be read
  if (widgets.framesUntilMeasured > 0) {
    widgets.framesUntilMeasured--;
    if (widgets.framesUntilMeasured === 0) {
      var baseRect = widgets.track.getBoundingBox();
      widgets.baseWidth = baseRect.right - baseRect.left;
      widgets.baseHeight = baseRect.top - baseRect.bottom;
    }
    return;
  }

  var countRect = widgets.count.getBoundingBox();
  var countWidth = countRect.right - countRect.left;
  var countCenterX = (countRect.right + countRect.left) / 2;
  // The text's layout box gives the line height; the bounding box only covers the glyphs
  var layoutRect = widgets.count.worldSpaceRect;
  var countHeight = layoutRect.top - layoutRect.bottom;
  var barHeight = countHeight * BAR_HEIGHT_FACTOR;

  var trackY = baseText.worldSpaceRect.bottom - BAR_GAP - barHeight / 2;
  var countY = trackY - barHeight / 2 - BAR_GAP - countHeight / 2;
  var rowsY = countY - countHeight / 2 + script.rowSpacing * 0.25;

  sizeBar(countWidth, barHeight, widgets.track);
  widgets.track.getSceneObject().getTransform().setLocalPosition(new vec3(countCenterX, trackY, 0));

  var fraction = totalCount > 0 ? completedCount / totalCount : 0;
  var fillWidth = countWidth * fraction;
  var debugKey = [countWidth, countHeight, widgets.baseWidth, widgets.baseHeight, fillWidth].join(",");
  if (debugKey !== lastDebugKey) {
    lastDebugKey = debugKey;
    print("GroceryListController bar: countW=" + countWidth + " countH=" + countHeight +
      " baseW=" + widgets.baseWidth + " baseH=" + widgets.baseHeight +
      " fillW=" + fillWidth + " done=" + completedCount + "/" + totalCount);
  }
  widgets.fill.enabled = fillWidth > 0;
  if (fillWidth > 0) {
    var actualWidth = sizeBar(fillWidth, barHeight, widgets.fill);
    widgets.fill.getSceneObject().getTransform().setLocalPosition(new vec3(countCenterX - countWidth / 2 + actualWidth / 2, trackY, 0));
  }

  widgets.count.getSceneObject().getTransform().setLocalPosition(new vec3(0, countY, 0));

  var rowsTransform = script.rowsParent.getTransform();
  var position = rowsTransform.getLocalPosition();
  if (Math.abs(position.y - rowsY) > 0.01) {
    rowsTransform.setLocalPosition(new vec3(position.x, rowsY, position.z));
  }
}

// The bar text has no margins when measured, so its own size is the base the margins grow from
function sizeBar(width, height, text) {
  var marginX = Math.max(0, (width - progressWidgets.baseWidth) / 2);
  var marginY = Math.max(0, (height - progressWidgets.baseHeight) / 2);
  text.backgroundSettings.margins = Rect.create(marginX, marginX, marginY, marginY);
  return Math.max(width, progressWidgets.baseWidth);
}

script.createEvent("UpdateEvent").bind(layoutHeader);

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
