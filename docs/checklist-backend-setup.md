# Checklist Backend Setup (macOS)

How to run the grocery checklist stack locally: MySQL, the FastAPI server, and the Vite web app. The Lens Studio lens (`GroceryListController.js`) reads the same API as the web app, so items added or checked in the web page show up in the lens.

```
Web app (Vite, :5173) ─┐
                       ├─ FastAPI (:8000) ─ MySQL (aislevision)
Spectacles lens ───────┘
```

Neither client connects to MySQL directly.

The code lives in `server/` (FastAPI) and `web/` (Vite). It comes from Josh's "Implement grocery checklist MVP" commit (`06133ff`).

## What you need

| Tool | Needed for | Notes |
|---|---|---|
| Python 3.10+ | API server | Packages go in a venv, so nothing is installed globally |
| MySQL Community Server | Storing the list | Installer depends on your chip, see below |
| Node.js LTS | Web page | Installer depends on your chip, see below |
| ngrok | Testing on real Spectacles | Optional. Spectacles cannot reach `127.0.0.1`, so it needs an HTTPS tunnel, see step 5 |
| Lens Studio 5.15.4 | The lens | Already part of the project |

### Pick installers for your Mac

Check your chip first: `uname -m` prints `arm64` (Apple Silicon) or `x86_64` (Intel).

| | Apple Silicon (`arm64`) | Intel (`x86_64`) |
|---|---|---|
| **MySQL** | dev.mysql.com/downloads/mysql, the default **macOS ARM 64-bit DMG**, or `brew install mysql` | Same site, **Archives** tab, **macOS (x86, 64-bit) DMG**. The default download is ARM-only and will not run on Intel |
| **Node.js** | nodejs.org, macOS Installer (`.pkg`) for **arm64**, or `brew install node` | nodejs.org, macOS Installer (`.pkg`) for **x64** |

Notes:

- **macOS version:** MySQL builds are labeled by macOS release (for example "macOS 15"). Oracle says a package for a newer macOS is compatible with the previous release (the 15 package works on 14). If your macOS is older than the oldest listed package, use an older MySQL version from the Archives tab.
- **Homebrew on Intel with older macOS:** `brew install mysql` may have no prebuilt binary and compile MySQL from source, which can take an hour or more. Use the official installers instead.
- **nvm** also works for Node, but the `.pkg` is simpler and needs no shell config changes.
- **Installer vs Homebrew paths differ.** The MySQL installer puts the client at `/usr/local/mysql/bin/mysql`, which is not on your `PATH` by default. Homebrew puts `mysql` on your `PATH`. The commands below use the installer path. With Homebrew, drop the `/usr/local/mysql/bin/` prefix and start the server with `brew services start mysql`.

## Setup

### 1. MySQL

1. Install and note the temporary root password the installer prints.
2. Start the server. With the installer: **System Settings, then MySQL (bottom of the sidebar; the pane is also in the search box), then Start MySQL Server**. Terminal alternative: `sudo /usr/local/mysql/support-files/mysql.server start`. With Homebrew: `brew services start mysql`.
3. Change the temporary password. MySQL blocks every other query until you do:
   ```bash
   /usr/local/mysql/bin/mysql -u root -p --connect-expired-password
   ```
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'your-new-password';
   ```
4. Create the database (from the repo root):
   ```bash
   /usr/local/mysql/bin/mysql -u root -p < server/sql/init.sql
   ```
   Tables are created by the server on first start.

### 2. API server

From the repo root:

```bash
python3 -m venv server/.venv
server/.venv/bin/python -m pip install -r server/requirements.txt
cp server/.env.example server/.env      # then set MYSQL_PASSWORD in server/.env
server/.venv/bin/python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```

`server/.env` is gitignored. Never commit it.

The server uses relative imports, so run it from the repo root with `server.main:app`, not from inside `server/`.

Check it:

```bash
curl localhost:8000/health                    # {"ok":true,"database":"connected"}
curl localhost:8000/api/lists/demo/items      # {"list_id":"demo","items":[],"total":0,"completed":0}
```

A list named `demo` is created automatically.

### 3. Web app

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173. The API URL defaults to `http://localhost:8000`. To change it, copy `web/.env.example` to `web/.env` and set `VITE_API_URL`.

### 4. Lens

Use `GroceryListController.js` on a Text object in the scene.

- **API URL:** `http://127.0.0.1:8000/api/lists/demo/items` for Lens Studio preview.
- **Preview only:** enable **Project Settings, General, API Settings, Allow Experimental API**. Experimental API mode blocks public publishing.
- **Real Spectacles:** use an ngrok HTTPS tunnel, see [Testing on Spectacles with ngrok](#5-testing-on-spectacles-with-ngrok).
- The lens polls every 5 seconds, so web changes appear within about 5 seconds.

### 5. Testing on Spectacles with ngrok

Spectacles cannot reach `127.0.0.1` on your computer (on the glasses that address is the glasses themselves), and the Internet Module needs HTTPS. ngrok gives your local API a public HTTPS address.

**One-time setup**

1. Install ngrok from ngrok.com/download (or `brew install ngrok/ngrok/ngrok` where Homebrew has a prebuilt package).
2. Create a free ngrok account and copy your authtoken from the dashboard.
3. Register it once: `ngrok config add-authtoken <your-token>`. This is stored in your user config, not in the repo. Never commit it.

**Each test session**

1. Make sure MySQL and the API are running (steps 1 and 2).
2. Start the tunnel: `ngrok http 8000`. It prints a line like
   `Forwarding https://example-name.ngrok-free.dev -> http://localhost:8000`.
3. Check the tunnel from your computer: `curl https://example-name.ngrok-free.dev/api/lists/demo/items`. It should return the list JSON.
4. In Lens Studio, select the object with `GroceryListController` (`GroceryListText`) and set **Api Url** to
   `https://example-name.ngrok-free.dev/api/lists/demo/items`.
5. Save and send the lens to the glasses.

**Notes**

- The free address changes every time ngrok restarts, so repeat steps 2 to 4 each session. A reserved domain from the ngrok dashboard avoids this.
- Keep the ngrok terminal open while testing. Closing it ends the tunnel and the lens shows `Update failed`.
- ngrok's local inspector at http://localhost:4040 lists every request that reaches the API. Requests from Lens Studio preview have a `LensStudioInternal` user agent. Requests from the glasses appear from a different address with an empty user agent. This is the quickest way to tell whether the glasses are reaching the server.
- The API's CORS rules already allow `*.ngrok-free.app`. The Lens itself is not a browser, so it does not depend on CORS.
- **Do not commit the ngrok URL.** After testing, set **Api Url** back to `http://127.0.0.1:8000/api/lists/demo/items` before committing `Scene.scene`.
- Lens Studio preview works with either address. The Experimental API setting (step 4) is required for local HTTP and blocks public publishing.

## API reference

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | | Database connectivity check |
| GET | `/api/lists/{list_id}/items` | | `{list_id, items:[{id,name,checked}], total, completed}`. This is what the lens reads |
| POST | `/api/lists/{list_id}/items` | `{"name": "..."}` | Creates an unchecked item |
| PATCH | `/api/items/{id}` | `{"checked": true}` | |
| DELETE | `/api/items/{id}` | | Returns 204 |

## Troubleshooting

- **`Can't connect to MySQL server on '127.0.0.1:3306'`:** MySQL is not running. Start it (step 1.2).
- **`Could not initialize MySQL` on API start:** check the `MYSQL_*` values in `server/.env` and that `aislevision` exists.
- **Lens shows `Update failed: ...`:** the API is not running, or the URL is wrong. On a real device, `127.0.0.1` points at the device itself, so use the ngrok URL.
- **Lens shows an `URL is not secure` message:** enable Allow Experimental API for local HTTP preview.
- **Glasses show nothing, and no requests reach ngrok:** check the ngrok inspector (http://localhost:4040). If nothing from the glasses appears, the lens is not starting. Read the Logger panel in Lens Studio with the glasses connected. One cause seen here: `Script Exception: Input cropTexture was not provided for the object [BoundingBoxes]`. It means `BoundingBoxVisualizer` has an empty **Crop Texture**, so assign the `Screen Crop Texture` from `Assets/Rendering` and resend. That script error stops the whole lens, not only the checklist.
- **Glasses poll for a while, then the lens quits or sleeps with no error:** check battery and temperature first. The lens runs the camera, ML model, bounding boxes and network polling together, which drains and heats the glasses.
- **ngrok shows `ERR_NGROK_...` or the address stopped working:** the tunnel was restarted and the address changed. Copy the new `Forwarding` address into **Api Url**.
- **Web page loads but the list is empty or errors:** open the browser console and check that the API on port 8000 is reachable.

## Old code still in the repo

The first backend attempt is still under `server/src/` (Express and TypeScript, port 3000, table `grocery_items`) with the static pages in `web/`. It is not used by the setup above. `server/data/aislevision.sqlite-shm` and `-wal` are leftover SQLite working files from it and are not needed.
