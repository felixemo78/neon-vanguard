# Realistic Ships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every craft in NEON VANGUARD read as a realistic metal aircraft in the neon world: the player ship is one of a kind, every enemy instance looks a little different, and each of the four bosses has its own airframe.

**Architecture:** All drawing stays in `neon-vanguard.html` (single ES5 IIFE, canvas 2D). One shared renderer, `drawCraft`, draws any enemy hull (metal shading, livery, banking, details) at the current transform; `drawEnemy` and `drawTitleSwarm` both call it. Per-instance variety is data on the enemy object (`livery`, `wing`, `bank`, `hull`), rolled in `spawnEnemy`. Tests are plain Node scripts that load the game script against a recording stub canvas.

**Tech Stack:** HTML5 canvas 2D, ES5 JavaScript (`var`, no modules, no build), Node (only to run tests).

**Spec:** No separate spec doc. The source is the user's request ("realistic planes or ships, unique main character, enemies different not identical") plus their answers, which are written out below as Global Constraints.

## Global Constraints

- Art direction: **realistic metal + neon**. Hulls are shaded like brushed metal with a specular sheen, panel lines, livery paint and a sun-cast drop shadow. Neon stays on engines, sensor eyes, weapons and outlines. Enemy hue identity (`ETYPES[type].color`) must stay readable.
- Variety: every spawned enemy rolls `livery` in `{0, 1, 2}` and `wing` in `[0.9, 1.1]`. Two enemies of the same type should rarely look identical.
- Bosses: WARDEN `'carrier'`, HYDRA `'hydra'`, LANCER `'lance'`, OBLIVION `'wing'`. Each gets its own outline.
- Player: a bright silver-white hull `#e8edf2` with gold trim `#ffcf5c` and a blue-white engine/contrail `#bfe3ff`. No `ETYPES` or `BOSSES` color may equal these. Enemies use dark painted metal, so the player stands out by brightness as well as hue.
- Hitboxes never change: collision keeps using `e.r` / `p.r`. Livery, `wing` and `bank` are drawing-only.
- Code style: match the file. That means ES5 `var`, 2-space indent, section banners `// ---- name`, one-line "why" comments, and the existing helpers (`withAlpha`, `shadeHex`, `hullPath`, `engineDot`, `turret`, `clamp`, `lerp`).
- `neon-vanguard.html` is the only production file. It is **not a git repo**: skip commit steps. Before Task 1, copy the file to `neon-vanguard.pre-ships.html` (if OneDrive blocks new files, use `[IO.File]::WriteAllBytes` from PowerShell, which worked before).
- New window exports go on the existing `window.NEON` object at the bottom of the script.

## Review Focus

1. **Hitbox drift.** Livery `wing` scale or banking must not change collisions. Pinned in Task 2 (`e.r` equals `ETYPES` r, and elite r equals round(r*1.25)).
2. **Angle wrap.** An enemy turning across ±π must not snap to full bank for one frame. Pinned in Task 3 (`steerBank` from 3.1 to -3.1 gives |bank| < 0.2).
3. **Hit flash.** The white hit-flash must still show over any livery. Pinned in Task 1 (flash=true adds a `#ffffff` color stop).
4. **Boss count past 4.** The fifth boss wraps to WARDEN and must still have a hull. Pinned in Task 4 (bossNum 5 gives `'carrier'`).
5. **Crowd performance.** 90 enemies on screen must hold 60 fps in a real browser, since gradients are built per craft per frame. Checked in Task 5 Step 6 (average frame < 16 ms).

---

### Task 1: Shared craft renderer with metal shading and drop shadow

**Files:**
- Modify: `neon-vanguard.html`, specifically `drawEnemy` (~line 2349), `drawTitleSwarm` (~line 3641) and the `window.NEON` export block.
- Create: `tests/harness.js`, `tests/ships.test.js`

**Interfaces:**
- Produces:
  - `drawCraft(type, r, color, o, flash)`: draws one hull facing +x at the current transform origin. `o` is any object with optional fields `livery` (0|1|2), `wing` (number), `bank` (-1..1), `hull` (boss hull key), `fuse` (bomber). An enemy object can be passed directly as `o`. `flash` is a boolean.
  - `metalFill(r, color, bank, flash)`: returns a `CanvasGradient` for the hull body.
  - `dropShadow(build, x, y, ang, alt)`: fills `build()`'s path in black at alpha 0.35, offset `(alt * 0.6, alt)` from `(x, y)` and rotated `ang`.
  - Harness `load(htmlPath)`: returns `{ N, G, ctx, calls, frame(n) }`, where `ctx` is the recording stub context.
- Exports added to `window.NEON`: `drawCraft`, `enemyOutline`, `ETYPES`, `BOSSES`.

- [ ] **Step 1: Write the test harness `tests/harness.js`**

It evals the `<script>` body of `neon-vanguard.html` with stubbed globals. The stub canvas context is a `Proxy` that records every method call as `[name, args]` into `calls`. `createLinearGradient` and `createRadialGradient` return `{ addColorStop: (o, c) => calls.push(['addColorStop', [o, c]]) }`. `measureText` returns `{ width: s.length * 6 }`. `document.createElement` returns a canvas whose `getContext` gives the same stub. `window` has `innerWidth: 1280`, `innerHeight: 800`, `devicePixelRatio: 1`, and a no-op `localStorage`. `requestAnimationFrame` is a no-op. `frame(n)` calls `N.frame(t += 16.7)` n times. Reference implementation: the scratchpad `smoke.js` from the previous session uses this exact stub.

- [ ] **Step 2: Write the failing tests in `tests/ships.test.js`**

```js
var assert = require('assert');
var h = require('./harness').load(__dirname + '/../neon-vanguard.html');
var N = h.N, G = h.G;

// every type draws and fills
Object.keys(N.ETYPES).forEach(function (t) {
  h.calls.length = 0;
  N.drawCraft(t, N.ETYPES[t].r, N.ETYPES[t].color, { livery: 0, wing: 1, bank: 0, hull: 'carrier' }, false);
  assert(h.calls.some(function (c) { return c[0] === 'fill'; }), t + ' fills');
});

// hit flash shows white
h.calls.length = 0;
N.drawCraft('grunt', 14, '#ff3b6b', { livery: 2, wing: 1, bank: 0 }, true);
assert(h.calls.some(function (c) { return c[0] === 'addColorStop' && c[1][1] === '#ffffff'; }), 'flash adds white stop');

// title and in-game frames still run
G.state = 'title'; h.frame(5);
N.startGame();
Object.keys(N.ETYPES).forEach(function (t) { N.spawnEnemy(t, 400, 300).spawn = 0; });
h.frame(10);
console.log('task1 ok');
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `node tests/ships.test.js`
Expected: FAIL with `TypeError: N.drawCraft is not a function`

- [ ] **Step 4: Implement `metalFill`, `dropShadow` and `drawCraft`, then switch the callers**

- `metalFill` builds a linear gradient across the hull's width (y from -r to r): bright edge `shadeHex(color, -30)`, then mid `shadeHex(color, -115)`, then shadow `#05080f`. Add a narrow white sheen stop at alpha 0.18 whose position moves with `bank` (0.3 + bank × 0.2). When `flash` is true, use stops `#ffffff`, `#ffe3ea`, `#ff9ab5`.
- `drawCraft` contains the existing top-face block of `drawEnemy`, unchanged in order: hull fill, neon outline stroke, `drawCraftDetail(type, r, col, o)`, lit rim. Before drawing it applies `ctx.scale(1, (o.wing || 1) * (1 - Math.abs(o.bank || 0) * 0.25))`. The fill uses `metalFill`. It passes `o.hull` to `enemyOutline` (added in Task 4; until then the 4th argument is ignored).
- In `drawEnemy`, replace the `extrudeSilhouette` volume pass and the `contactShadow` call with `dropShadow(function(){ enemyOutline(ctx, e.type, e.r * sc, e.hull); }, e.x, e.y, e.angle, boss ? 26 : 12)`, then call `drawCraft(e.type, e.r, e.color, e, flash)` inside the existing translate/scale/rotate block.
- In `drawTitleSwarm`, replace the `extrudeSilhouette` and outline fill/stroke with `dropShadow` plus `drawCraft(ty, rad, col, { livery: i % 3, wing: 1, bank: 0 }, false)` at alpha 0.6.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node tests/ships.test.js`
Expected: prints `task1 ok`, exit code 0

---

### Task 2: Per-instance liveries and wing variation

**Files:**
- Modify: `neon-vanguard.html`, specifically `spawnEnemy` (~line 611) and `drawCraft` (Task 1)
- Test: `tests/ships.test.js` (append)

**Interfaces:**
- Consumes: `drawCraft(type, r, color, o, flash)` from Task 1, which reads `o.livery` and `o.wing`.
- Produces: enemy fields `e.livery` (int 0..2) and `e.wing` (number 0.9..1.1).

- [ ] **Step 1: Append the failing tests**

```js
G.enemies = [];
var gr = []; for (var i = 0; i < 30; i++) gr.push(N.spawnEnemy('grunt', 100, 100));
var liv = {}; gr.forEach(function (e) {
  assert([0, 1, 2].indexOf(e.livery) >= 0, 'livery in range');
  assert(e.wing >= 0.9 && e.wing <= 1.1, 'wing in range');
  assert.strictEqual(e.r, N.ETYPES.grunt.r, 'hitbox unchanged');
  liv[e.livery] = 1;
});
assert(Object.keys(liv).length >= 2, 'grunts are not all the same livery');
assert(gr.some(function (e) { return e.wing !== gr[0].wing; }), 'wing varies');
var el = N.makeElite(N.spawnEnemy('tank', 200, 200), N.AFFIXES[0]);
assert.strictEqual(el.r, Math.round(N.ETYPES.tank.r * 1.25), 'elite hitbox unchanged');
[0, 1, 2].forEach(function (l) { N.drawCraft('tank', 27, '#a78bfa', { livery: l, wing: 1.1, bank: 0 }, false); });
console.log('task2 ok');
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node tests/ships.test.js`
Expected: FAIL with `AssertionError: livery in range`

- [ ] **Step 3: Implement the liveries**

- In `spawnEnemy`, set `livery: randInt(0, 2)` and `wing: rand(0.9, 1.1)` on the new enemy. Bosses get `livery: 0, wing: 1`.
- In `drawCraft`, after the hull fill and before the outline, `ctx.save()`, then clip to `enemyOutline(ctx, type, r, o.hull)` and paint the livery:
  - **0, factory:** nothing.
  - **1, banded:** two bands across the hull at x = 0.55r and x = -0.45r, width 0.14r, white at alpha 0.5.
  - **2, striker:** a diagonal stripe on each wing from (0, ±0.3r) to (-0.5r, ±r), width 0.12r, in `color` at alpha 0.85.

  Then `ctx.restore()`.
- Skip the livery pass when `flash` is true, so the white flash stays clean.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node tests/ships.test.js`
Expected: prints `task1 ok` and `task2 ok`

---

### Task 3: Banking on turns (player and enemies)

**Files:**
- Modify: `neon-vanguard.html`, specifically `updateEnemy` (right after `e.angle = Math.atan2(dy, dx);`), `updatePlayer` (right after `p.angle += ...`), and the `drawPlayer` top-face block
- Test: `tests/ships.test.js` (append)

**Interfaces:**
- Consumes: `drawCraft` reads `o.bank` (Task 1).
- Produces: `steerBank(o, newAngle, dt)`, which updates `o.bank` (clamped -1..1) and `o.prevAngle`, and returns nothing. It is exported on `window.NEON`. Fields `e.bank` and `p.bank` are set from it.

- [ ] **Step 1: Append the failing tests**

```js
var o = { bank: 0 };
N.steerBank(o, 0, 1 / 60);
N.steerBank(o, 0.5, 1 / 60);
assert(o.bank > 0 && o.bank <= 1, 'turning banks');
for (var k = 0; k < 120; k++) N.steerBank(o, 0.5, 1 / 60);
assert(Math.abs(o.bank) < 0.05, 'level flight levels out');
var w = { bank: 0 };
N.steerBank(w, 3.1, 1 / 60);
N.steerBank(w, -3.1, 1 / 60);
assert(Math.abs(w.bank) < 0.2, 'no snap across +-pi');
console.log('task3 ok');
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node tests/ships.test.js`
Expected: FAIL with `TypeError: N.steerBank is not a function`

- [ ] **Step 3: Implement `steerBank(o, newAngle, dt)`**

First call (no `prevAngle`): store the angle, keep `bank`. Otherwise:
- Take the angle delta, wrapped to (-π, π] with the same `while` loops `updatePlayer` uses.
- `target = clamp(delta / dt * 0.12, -1, 1)`.
- `o.bank = lerp(o.bank || 0, target, Math.min(1, dt * 8))`.
- `o.prevAngle = newAngle`.

Call it in `updateEnemy` and `updatePlayer`. In `drawPlayer`, apply `ctx.scale(1, 1 - Math.abs(p.bank || 0) * 0.25)` right after `ctx.rotate(p.angle)` in the top-face block.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node tests/ships.test.js`
Expected: prints `task1 ok` through `task3 ok`

---

### Task 4: A unique airframe for each boss

**Files:**
- Modify: `neon-vanguard.html`, specifically `BOSSES` (~line 604), `spawnEnemy` boss branch, `enemyOutline` (~line 2286) boss branch, and `drawCraftDetail` boss branch (~line 2627)
- Test: `tests/ships.test.js` (append)

**Interfaces:**
- Consumes: `drawCraft` passes `o.hull` to `enemyOutline` (Task 1).
- Produces:
  - `BOSSES[i].hull` values: `'carrier'` (WARDEN), `'hydra'` (HYDRA), `'lance'` (LANCER), `'wing'` (OBLIVION).
  - `enemyOutline(c, type, r, hull)`: the new 4th parameter matters only for `type === 'boss'`.
  - `e.hull` is set on boss spawn.

- [ ] **Step 1: Append the failing tests**

```js
var hulls = N.BOSSES.map(function (b) { return b.hull; });
assert.deepStrictEqual(hulls, ['carrier', 'hydra', 'lance', 'wing']);
var sigs = hulls.map(function (hk) {
  h.calls.length = 0;
  N.enemyOutline(h.ctx, 'boss', 72, hk);
  return JSON.stringify(h.calls);
});
assert.strictEqual(new Set(sigs).size, 4, 'four distinct boss outlines');
G.bossNum = 4;
assert.strictEqual(N.spawnEnemy('boss', 300, 200).hull, 'carrier', '5th boss wraps to WARDEN hull');
hulls.forEach(function (hk) { N.drawCraft('boss', 72, '#f43f5e', { hull: hk }, false); });
console.log('task4 ok');
```
- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node tests/ships.test.js`
Expected: FAIL with `AssertionError` on the `deepStrictEqual` of hulls

- [ ] **Step 3: Implement the four boss hulls**

- Add `hull` to each `BOSSES` entry.
- In the `spawnEnemy` boss branch, set `e.hull = e.variant.hull`.
- In the `enemyOutline` boss branch, switch on `hull` using `hullPath` half-planforms (nose +x, y ≤ 0, multiplied by r):
  - **`'carrier'`:** the current boss points, unchanged.
  - **`'hydra'`:** three prongs. Use `[[1.0,0],[0.35,-0.12],[0.7,-0.55],[0.1,-0.42],[-0.3,-0.95],[-0.8,-0.7],[-0.7,-0.25],[-0.95,0]]`.
  - **`'lance'`:** a long spear with forward-swept wings. Use `[[1.45,0],[0.4,-0.14],[0.25,-0.75],[-0.05,-0.8],[-0.35,-0.22],[-0.9,-0.3],[-0.85,0]]`.
  - **`'wing'`:** a flying wing. Use `[[0.55,0],[0.1,-0.35],[-0.45,-1.0],[-0.7,-0.95],[-0.55,-0.4],[-0.75,0]]`.
- In the `drawCraftDetail` boss branch, keep the shared hangar glow and engine bank. Move the turret positions per hull with a small lookup table `{ carrier: [...], hydra: [...], lance: [...], wing: [...] }` of `[x, y, rad]` in r units.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node tests/ships.test.js`
Expected: prints `task1 ok` through `task4 ok`

---

### Task 5: Signature player look and contrail, then a check in the real browser

**Files:**
- Modify: `neon-vanguard.html`, specifically `drawPlayer` (~line 2114), `updatePlayer` (the trail block), `startGame` (reset), and the `G` state object
- Test: `tests/ships.test.js` (append)

**Interfaces:**
- Consumes: `metalFill` (Task 1), `p.bank` (Task 3).
- Produces: `PLAYER_LOOK = { hull: '#e8edf2', trim: '#ffcf5c', engine: '#bfe3ff' }` and `G.contrail`, an array of `{ x, y, life }` capped at 60 entries. Both are exported on `window.NEON`.

- [ ] **Step 1: Append the failing tests**

```js
var L = N.PLAYER_LOOK;
var taken = Object.keys(N.ETYPES).map(function (t) { return N.ETYPES[t].color.toLowerCase(); })
  .concat(N.BOSSES.map(function (b) { return b.color.toLowerCase(); }));
[L.hull, L.trim, L.engine].forEach(function (c) { assert(taken.indexOf(c) < 0, c + ' is player-only'); });
N.startGame();
assert.strictEqual(G.contrail.length, 0, 'contrail resets');
G.player.vx = 300; G.player.vy = 0; G.player.inv = 99;
h.frame(120);
assert(G.contrail.length > 0 && G.contrail.length <= 60, 'contrail grows and is capped');
console.log('task5 ok');
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node tests/ships.test.js`
Expected: FAIL with `TypeError: Cannot read properties of undefined (reading 'hull')`

- [ ] **Step 3: Implement the player look and contrail**

- **`drawPlayer` top face:**
  - Body fill: `metalFill(p.r, PLAYER_LOOK.hull, p.bank, false)` with the dark end lifted to `#6b7a88`, so the player stays the brightest hull on screen.
  - Seams and wing chevrons: stroke in `PLAYER_LOOK.trim` at alpha 0.8.
  - Nozzle cores and plumes: tint with `PLAYER_LOOK.engine`. Keep the overdrive white.
  - Replace the hull `extrudeSilhouette` with `dropShadow(function(){ shipPath(ctx); }, p.x, p.y, p.angle, 14)`, and drop the `contactShadow` call.
- **Contrail:**
  - In `updatePlayer`, when the speed is over 40, push the two wing-tip points (`±0.95r` across the hull, `-0.4r` back, rotated by `p.angle`) with `life: 0.5`. Trim to the last 60 entries.
  - Age the points in `updateFx` and remove dead ones.
  - Draw them in `drawPlayer` before the hull as two `lighter` polylines in `PLAYER_LOOK.engine`, with alpha set by `life`.
  - Clear `G.contrail` in `startGame` and add `contrail: []` to `G`.
  - Remove the teal `#2dd4bf` trail particles that this replaces.

- [ ] **Step 4: Run all the tests and confirm they pass**

Run: `node tests/ships.test.js`
Expected: prints `task1 ok` through `task5 ok`

- [ ] **Step 5: Visual check in the browser pane**

Open `neon-vanguard.html` in the built-in browser pane. If the user is mid-game in that tab, ask first. Then run `NEON.startGame(); NEON.startWave(4)` and spawn one of each type plus one boss per hull from the console. Take screenshots and confirm:
- Metal shading and sheen are visible, and drop shadows fall down-right.
- At least two different liveries show among enemies of the same type.
- Bosses are distinct shapes.
- The player ship is visibly the brightest hull, with gold trim and a blue-white contrail.
- Hulls flatten slightly while turning.
- The title swarm uses the new hulls.

- [ ] **Step 6: Performance check**

In the pane console, spawn 90 grunts (`for (i=0;i<90;i++) NEON.spawnEnemy('grunt', 100+i*10, 200).spawn=0`). Then measure 120 frames: `var t0=performance.now(), n=0; (function f(){ if(++n<120) requestAnimationFrame(f); else console.log((performance.now()-t0)/120); })()`.
Expected: logged average under 16 (ms). If it is over, cache each `metalFill` gradient per `(type, livery, flash)` on a plain object. Add a `shortcut:` comment only if the cache is skipped.
