# Lens Studio Grocery Checklist

`GroceryListController.js` displays items returned by a checklist API. It polls
every five seconds and shows `[ ]` for unchecked items, `[x]` for checked items,
and completed/total progress. Mock mode is off by default.

## Add the controller to a Spectacles Lens

1. Open `lensstudio-snapMLstarter.esproj` from this folder in Lens Studio.
2. Create a **Screen Text** object named `GroceryListText`.
3. Add a **Script Component** and select `Assets/GroceryListController.js` from
   the Asset Browser.
4. Optionally assign the object's Text component to **Grocery Text**; otherwise
   the script finds the Text component on the same object.
5. Set **API URL** to the checklist endpoint. For local Preview use
   `http://127.0.0.1:8000/api/lists/demo/items`. For Spectacles on a different
   network, use an HTTPS tunnel URL for the API.
6. Leave **Mock Mode** off for live checklist data.

For local HTTP Preview, enable **Project Settings → General → API Settings →
Allow Experimental API** and set the Preview device type to **Spectacles**.
Experimental API mode is for testing and prevents public publishing.

The API must return JSON with an `items` array containing `name` and `checked`
fields, plus numeric `total` and `completed` fields. The app and Lens call the
API; neither client connects directly to a database.
