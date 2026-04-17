//@input Component.Text[] items

var itemNames = ["Milk", "Eggs", "Bread"];
var checkedStates = [false, false, false];

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

updateUI();