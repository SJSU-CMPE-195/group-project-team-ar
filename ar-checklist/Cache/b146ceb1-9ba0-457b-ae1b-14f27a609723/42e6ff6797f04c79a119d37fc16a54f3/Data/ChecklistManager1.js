//@input Component.Text[] items

var itemNames = ["Milk", "Eggs", "Bread"];
var checkedStates = [false, false, false];
var currentToggleIndex = 0;

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

function toggleNextItem() {
    checkedStates[currentToggleIndex] = !checkedStates[currentToggleIndex];
    currentToggleIndex = (currentToggleIndex + 1) % itemNames.length;
    updateUI();
}

updateUI();

var delayedEvent = script.createEvent("DelayedCallbackEvent");
delayedEvent.bind(function () {
    toggleNextItem();
    delayedEvent.reset(1.5);
});

delayedEvent.reset(1.5);