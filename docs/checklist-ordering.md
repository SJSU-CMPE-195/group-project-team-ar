# Automatic Node checklist ordering

The Node/TypeScript backend now orders `GET /api/items` using
`server/src/checklistOrdering.ts`. The response remains a plain array of
`{ id, name, aisle, status }` rows. No fields, database records, schema, or
mutation responses change.

The A* implementation, route planner, map loader, demo map, and original
pathfinding tests were copied from `origin/feature/2d-path-planning` without
merging that branch. Only explicit type annotations were added to the imported
test to pass this project's strict TypeScript build. The algorithms are unchanged.

For each read, the adapter:

1. Separates completed (`picked_up`) rows from pending rows.
2. Groups pending rows by trimmed, uppercase aisle ID for lookup only. Original
   aisle strings and all item fields remain unchanged; duplicate items stay intact.
3. Filters map-supported aisles reachable from the entrance using the existing A*.
4. Passes unique reachable aisles to the existing `planRoute`, starting at the
   entrance without a checkout leg, and expands the resulting aisle visit order
   back into item groups. Within each group, database order is retained.
5. Appends unsupported, missing, or unreachable aisle groups in first-seen order,
   then completed rows in their original order.

If the planner throws, returns no route, or returns an invalid visit order, all
items remain available in stable aisle groups, with known reachable groups first.
If the map cannot load, all pending groups retain first-seen order. Exceptions
produce a server warning and do not turn a successful database read into an API
error. The original planner supports at most eight unique aisles; exceeding that
limit uses the same safe fallback rather than attempting an expensive search.

The Node website at `/app.html` fetches the ordered list after successful adds,
completion/uncompletion, deletes, and clearing completed rows. Its offline mode
still uses local storage and does not perform routing. A failed online mutation
or refresh is reported rather than creating a duplicate local add.

The Node Spectacles checklist is
`src/lensstudio-snapMLstarter/Assets/GroceryListController.js`. It already consumes
the plain array, lays out rows in response order, tracks rows by ID, and polls
every five seconds. Its pinch gestures, progress tracking, and detection code
require no changes. The separate `src/lensstudio-list` checklist and Vite website
use the FastAPI list-envelope API; they remain separate and unchanged.

## Demo scope

`server/data/demo_store_map.json` is the existing 9×7 placeholder, not a real
Target layout. It supports only E73, D74, and B49. Existing item mappings are
preserved: Fork maps to E73, Microwave to D74, and Banana to **B9**, not B49.
Banana therefore remains unsupported. Do not infer real locations from this demo.
Routes restart at the entrance on every read; there is no shopper localization,
checkout optimization, or persisted ordering. Completed items are excluded from
routing even when they share an aisle with a pending item.

## Local verification

Stay on `feature/path-planning-checklist`. From the repository root:

```sh
cd server
npm ci
npm test
npm run build
```

The test command runs the six original A* checks, adapter tests, a GET handler response-contract check, and website
mutation-refresh regression tests. Adapter cases cover field preservation,
duplicate aisles, completed items, unknown aisles, unreachable destinations,
missing maps, and null/throwing/invalid planner results. Tests use the demo map
and mocked planner failures, with no database connection or writes.

For the full application, start MySQL, create the `aislevision` database using
`server/mysql/workbench_setup.sql`, and configure `server/.env` using
`server/.env.example` (preserve any existing credentials). Then, from `server`:

```sh
npm start
```

Open `http://localhost:3000/app.html` and check
`http://localhost:3000/api/health`. Use this Node-served page for these checks,
rather than the separate Vite/FastAPI application.

Add Microwave first, then Fork, another Microwave, and Banana. Pending Fork
(E73) should precede both Microwaves (D74), followed by Banana (B9). Mark Fork
complete: it moves to the bottom. Uncheck it: it returns before the Microwaves.
Delete an item or clear picked-up items: the remaining list refreshes from the
server. Inspect `GET /api/items` to confirm IDs and fields are unchanged and that
the response is still an array. Tests exercise B49 directly without changing
the production Banana mapping.

For Spectacles, point the existing Node checklist's `apiUrl` at this server's
public HTTPS `/api/items` URL, disable mock mode, and allow the next poll. Check
that row order matches the website and pinch completion/progress still work.
Hardware validation requires Lens Studio/Spectacles and a reachable server.
