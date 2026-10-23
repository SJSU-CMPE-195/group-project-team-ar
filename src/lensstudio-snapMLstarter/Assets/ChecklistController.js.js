
 // @input Component.Text item1
 // @input Component.Text item2
 // @input Component.Text item3
 // @input Component.Text progressText

var items = ["Milk", "Eggs", "Bread"];
var collected = [false, false, false];

function updateChecklist() {
    var textComponents = [
        script.item1,
        script.item2,
        script.item3
    ];

    var count = 0;

    for (var i = 0; i < items.length; i++) {
        if (collected[i]) {
            textComponents[i].text = "☑ " + items[i];
            count++;
        } else {
            textComponents[i].text = "☐ " + items[i];
        }
    }

    script.progressText.text = count + "/3 Collected";
}

function toggleItem(index) {
    if (index < 0 || index >= items.length) {
        return;
    }

    collected[index] = !collected[index];
    updateChecklist();
}

script.toggleItem = toggleItem;

updateChecklist();



