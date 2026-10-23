//@input Component.Text groceryText
//@input Asset.InternetModule internetModule
//@input string apiUrl = "http://127.0.0.1:8000/api/lists/demo/items"
//@input bool mockMode = false

var POLL_INTERVAL_SECONDS = 5;
var requestInProgress = false;
var lastChecklist = "";
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

function formatChecklist(data) {
  var items = data.items;
  if (!Array.isArray(items)) {
    throw new Error("API response is missing the items array");
  }

  var completed = typeof data.completed === "number"
    ? data.completed
    : items.filter(function(item) { return item.checked === true; }).length;
  var total = typeof data.total === "number" ? data.total : items.length;
  var lines = ["Grocery List"];

  if (items.length === 0) {
    lines.push("No items yet.");
  } else {
    items.forEach(function(item) {
      lines.push((item.checked ? "[x] " : "[ ] ") + item.name);
    });
  }
  lines.push("");
  lines.push("Progress: " + completed + "/" + total + " completed");
  return lines.join("\n");
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
      lastChecklist = formatChecklist({
        items: mockItems,
        total: mockItems.length,
        completed: mockItems.filter(function(item) { return item.checked; }).length
      });
      displayMessage(lastChecklist + "\n(Mock data)");
      return;
    }

    if (!script.apiUrl || script.apiUrl.indexOf("YOUR-NGROK-URL") !== -1) {
      throw new Error("Set apiUrl to the local API or an active HTTPS tunnel");
    }

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

    var response = await internetModule.fetch(script.apiUrl);
    print("Grocery list API HTTP status: " + response.status);
    if (response.status < 200 || response.status >= 300) {
      throw new Error("HTTP " + response.status);
    }

    var data = await response.json();
    lastChecklist = formatChecklist(data);
    displayMessage(lastChecklist);
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
