# IDLA – Shelf Stocker

IDLA is a two-screen, DS-style browser game about stocking a grocery store. You drive a walkie pallet truck modeled on the Raymond 8210 from the warehouse door to a shelf location, then unload the pallet case by case onto the right spots. It started as a design for a Nintendo DS homebrew game (DSPico) and is being prototyped as a web game that runs on a phone.

Made by Keith (Beachkila) / Studio Wetware.

## How it plays

- **Top screen:** store map, current task, score.
- **Bottom screen:** close-up of the truck in the aisles. During an unload it shows three 4-ft shelf sections to drag cases onto.
- **Joystick:** walks the operator. Pointing ahead pulls the truck, with the pallet trailing behind. Pointing back pushes it forks-first. The truck pivots on its load wheels, so the pallet cuts inside on turns and can clip shelf ends.
- **A:** unload when the pallet is parked over the drop zone and lined up with the shelf, or pick up the next pallet at the warehouse door.
- **B:** horn. Nearby shoppers stop for a moment.
- **Shift:** a shift is 4 pallets. The score is placement points with a combo bonus, plus a time bonus, minus penalties for bumping carts, clipping shelves, and wrong placements found at the end-of-shift audit.

### Modes

| Mode | Rules |
|---|---|
| New Hire | Wrong spots are blocked, and matching spots glow while dragging |
| Easy | No blocking. Wrong placements are counted at the end-of-shift audit |
| Medium | Easy, plus shoppers with carts in the aisles |
| Hard | Medium, plus shoppers stop you to ask where a product is |
| Daily Shift | Medium rules, with the same pallets and locations for every player on that UTC day |

There are two playable stockers, chosen from the Character screen. The choice is saved on the phone.

### Store layout

The store is 120 × 94 ft with 200 shelf sections at 4 ft each: 72 on the walls and 128 on the islands. Aisles between islands are 12 ft, which is room for two trucks to pass. Section tags (for example `CHIPS-05`) are numbered per area.

## Files

| Path | What it is |
|---|---|
| `index.html` | The playable game, built from `src/`. GitHub Pages serves this file |
| `config.js` | Scoreboard address. Leave `scoreApi` empty to play without the online scoreboard |
| `manifest.webmanifest`, `sw.js`, `icons/` | Home-screen install and offline play |
| `src/game.js` | Game code |
| `src/shell.html` | Page template: layout, joystick, buttons |
| `src/sprites.json` | All sprites as PNG data |
| `tools/build.py` | Combines `src/` into `index.html` |
| `tools/make_icons.py` | Makes the home-screen icons from the sprites |
| `tools/sprites/` | Python scripts that draw the sprites. They write preview images into the folder they run from |
| `worker/` | Cloudflare Worker and D1 database for the scoreboard |

After changing anything in `src/`, rebuild:

```
python3 tools/build.py
```

## Run it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Arrow keys drive, Z is A, X is B.

## Publish on GitHub Pages

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, the branch to `main`, and the folder to `/ (root)`.
3. The game will be at `https://beachkila.github.io/IDLA/`.

To install it on a phone, open that address. On iPhone, tap **Share → Add to Home Screen**. On Android, tap **Install app**. After the first visit it works offline.

## Scoreboard on Cloudflare

The scoreboard is a Cloudflare Worker with a D1 (SQLite) database. Both fit in Cloudflare's free plan. You need a free Cloudflare account and Node.js.

```
cd worker
npm install
npx wrangler login
npx wrangler d1 create idla-scores
```

1. Copy the `database_id` that the last command prints into `worker/wrangler.toml`.
2. Create the table, then deploy:

   ```
   npm run db:init
   npm run deploy
   ```

3. `deploy` prints the Worker's address, for example `https://idla-scores.YOUR-NAME.workers.dev`. Paste it into `config.js` as `scoreApi`, then commit.
4. If the game is served from somewhere other than `https://beachkila.github.io`, add that address to `ALLOWED_ORIGINS` in `wrangler.toml` and deploy again.

### API

- `GET /scores?mode=medium&range=today|week|all` returns the top 10 scores.
- `POST /scores` adds a score. The game sends it after you enter three initials.

### Score checks

Scores come from a browser, so they can be faked. The Worker rejects results the game cannot produce:
- placement counts other than 96 cases
- a shift faster than 12 seconds per pallet
- a score above the maximum for the number of correct placements and the time taken
- help answers outside Hard mode
- a Daily Shift score from a previous day

It also limits each phone to one post every 20 seconds and 40 posts a day, using a random ID stored on the phone. These checks keep the board reasonable. They don't make it cheat-proof.

### Local testing

```
cd worker
npm run db:init:local
npx wrangler dev
```

To point the game at the local Worker, set `scoreApi` in `config.js` to `http://127.0.0.1:8787`.
