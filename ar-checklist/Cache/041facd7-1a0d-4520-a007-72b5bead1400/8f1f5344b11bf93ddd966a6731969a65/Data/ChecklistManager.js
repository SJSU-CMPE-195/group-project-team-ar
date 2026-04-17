//@input Component.Text[] items
//@input Component.Text addButton

var itemNames = [];
var checkedStates = [];
var demoItems = ["Milk", "Eggs", "Bread", "Apples", "Rice"];

function updateUI() {
    for (var i = 0; i < script.items.length; i++) {
        if (i < itemNames.length) {
            script.items[i].enabled = true;
            var prefix = checkedStates[i] ? "☑ " : "☐ ";
            script.items[i].text = prefix + itemNames[i];
        } else {
            script.items[i].enabled = false;
        }
    }
}

function addItem() {
    if (itemNames.length >= demoItems.length || itemNames.length >= script.items.length) {
        print("No more items to add");
        return;
    }

    itemNames.push(demoItems[itemNames.length]);
    checkedStates.push(false);
    updateUI();
}

function toggleItem(index) {
    if (index < checkedStates.length) {
        checkedStates[index] = !checkedStates[index];
        updateUI();
    }
}

function getItemIndex(sceneObjectName) {
    if (sceneObjectName === "Item1") { return 0; }
    if (sceneObjectName === "Item2") { return 1; }
    if (sceneObjectName === "Item3") { return 2; }
    if (sceneObjectName === "Item4") { return 3; }
    if (sceneObjectName === "Item5") { return 4; }
    return -1;
}

var tapEvent = script.createEvent("TapEvent");
tapEvent.bind(function(eventData) {
    var tappedObject = eventData.getSceneObject();

    if (!tappedObject) {
        return;
    }

    var objectName = tappedObject.name;

    if (objectName === "AddButtonText") {
        addItem();
        return;
    }

    var itemIndex = getItemIndex(objectName);
    if (itemIndex !== -1) {
        toggleItem(itemIndex);
    }
});

updateUI();