//@input Component.Text[] items

var itemNames = [];
var checkedStates = [];
var demoItems = ["Milk", "Eggs", "Bread", "Apples", "Rice"];

function updateUI() {
    for (var i = 0; i < script.items.length; i++) {
        script.items[i].enabled = true;

        if (i < itemNames.length) {
            var prefix = checkedStates[i] ? "☑ " : "☐ ";
            script.items[i].text = prefix + itemNames[i];
        } else {
            script.items[i].text = "☐";
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

// Press space to add an item
var keyEvent = script.createEvent("KeyPressEvent");
keyEvent.bind(function(eventData) {
    if (eventData.getKey() === Keys.Space) {
        addItem();
    }
});

// Press number keys 1–5 to toggle items
keyEvent.bind(function(eventData) {
    var key = eventData.getKey();

    if (key === Keys.Num1) {
        toggleItem(0);
    } else if (key === Keys.Num2) {
        toggleItem(1);
    } else if (key === Keys.Num3) {
        toggleItem(2);
    } else if (key === Keys.Num4) {
        toggleItem(3);
    } else if (key === Keys.Num5) {
        toggleItem(4);
    }
});

updateUI();