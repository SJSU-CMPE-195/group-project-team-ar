
 // @input Component.ScriptComponent checklistController
 // @input int itemIndex = 0

var interaction = script.getSceneObject().getComponent("Component.InteractionComponent");

if (interaction) {
    interaction.onTap.add(function () {
        print("Milk touch detected!");
        script.checklistController.toggleItem(script.itemIndex);
    });
}

print("MilkTouchTarget script loaded!");
