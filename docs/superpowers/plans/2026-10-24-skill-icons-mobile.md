# Skill Icons + Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Replace the abstract upgrade glyphs with skill-style icons that show what each upgrade actually does, so players aren't misled when choosing. (2) Turn on a mobile mode automatically on touch devices, with two joysticks and on-screen buttons for every action the game needs.

**Architecture:** Everything stays in `neon-vanguard.html` (ES5 IIFE, canvas 2D).
- **Icons:** a new `drawSkillIcon(id, col, t)` replaces `drawCardGlyph` at all 3 call sites (upgrade cards, pause build panel, game-over build panel). It draws a framed badge with a small scene built from the game's own art (ship, bullets, mine, enemy hull) and the effect on top.
- **Mobile:** a pure layout function, `touchLayout(W, H)`, describes the sticks and buttons. A pure hit test, `touchButtonAt(x, y)`, maps a touch to a button. The existing touch handlers call both. `drawTouchControls()` renders them.

**Tech Stack:** HTML5 canvas 2D, ES5 JavaScript, and Node tests using the existing `tests/harness.js` stub.

**Spec:** No separate spec doc. The source is the user's request ("change the icons like a real skill we use in game so users aren't misled when choosing; automatic mobile mode with joysticks for all skills or buttons we need in game") and the screenshot of the THRUSTERS, WEAK POINTS and PLATING cards.

## Global Constraints

- One icon per entry in `CARDS` (all 20 ids). No id may fall through to the generic hexagon fallback.
- Every icon must depict its effect with in-game visuals. Use these exact subjects:
  - `spd`: player ship with a long engine flame and speed lines
  - `rate`: a burst of three bullets in a row
  - `dmg`: one large bullet hitting with a spark
  - `hp`: armour plate with a `+`
  - `mag`: an XP gem pulled by curved arcs
  - `mine`: the mine sprite
  - `dash`: ship with afterimages
  - `pierce`: a bullet passing through two enemy hulls
  - `proj`: three bullets fanning out
  - `crit`: crosshair on an enemy hull
  - `critm`: crosshair with a cracked hull and a large spark
  - `life`: a heart with a drain line from an enemy
  - `regen`: a heart with a `+` and a pulse line
  - `thorn`: ship with spikes and a blast ring
  - `slow`: an enemy hull with a clock overlay
  - `od`: a reactor core with bolts
  - `odb`: a reactor with a long timer bar
  - `expl`: a bullet with an explosion ring
  - `richo`: a bullet bouncing between two enemies
  - `wave`: ship inside a shield bubble
- Icon colours stay keyed to rarity (`RCOLOR`). Ships and bullets use `PLAYER_LOOK` colours. Enemies use `ETYPES.grunt.color`.
- Mobile mode turns on when `('ontouchstart' in window) || navigator.maxTouchPoints > 0`, stored as `G.mobile`. There is no manual toggle.
- The required mobile controls:
  - **left stick:** move
  - **right stick:** aim and auto-fire while held
  - **buttons:** `dash`, `mine`, `od` (overdrive), `weapon` (cycles to the next unlocked weapon), `pause`
- Buttons are at least 52 CSS px in diameter, sit inside a 16 px edge margin, and never overlap the stick zones.
- Desktop (mouse and keyboard) behaviour must not change.
- Code style: ES5 `var`, 2-space indent, one-line why-comments, existing helpers. Not a git repo, so there are no commit steps. OneDrive may block new files from bash; use the Write/Edit tools.

## Review Focus

1. **Multi-touch.** Holding the move stick while tapping DASH must keep moving, and lifting the DASH finger must not release the stick. Tested in Task 2.
2. **Button versus stick.** A touch that starts on a button must never become a stick touch. Tested in Task 2 (`touchButtonAt` hit inside the button returns its id, and a hit outside every button returns `null`).
3. **Small and landscape screens.** At W=360,H=640 and W=844,H=390, no button may overlap another or a stick zone, and none may sit off-screen. Tested in Task 2.
4. **Locked weapons.** The `weapon` button must skip locked weapons, and do nothing when only PULSE is unlocked. Tested in Task 2.
5. **Pause on mobile.** There is no Escape key on a phone, so a tap anywhere while paused must resume. Tested in Task 2.

---

### Task 1: Skill icons that show what each upgrade does

**Files:**
- Modify: `neon-vanguard.html`, specifically `drawCardGlyph` (~line 3440, replaced) and its callers (~3632, ~3935, plus the game-over build panel). Add `drawSkillIcon` to the `window.NEON` exports.
- Test: `tests/skills.test.js` (new)

**Interfaces:**
- Consumes: `shipPath(c)`, `enemyOutline(c, type, r)`, `PLAYER_LOOK`, `ETYPES`, `RCOLOR`, `CARDS`, `poly`, `withAlpha`.
- Produces: `drawSkillIcon(id, col, t)`, which draws a roughly 28×28 icon centred on the current origin (the same footprint as the old glyph, so callers keep their scale). It returns `true` if it drew a known id and `false` for the fallback.

- [ ] **Step 1: Write the failing test `tests/skills.test.js`**

```js
var assert = require('assert');
var h = require('./harness').load(__dirname + '/../neon-vanguard.html');
var N = h.N;
var sigs = {};
N.CARDS.forEach(function (c) {
  h.calls.length = 0;
  assert.strictEqual(N.drawSkillIcon(c.id, '#7dd3fc', 0), true, c.id + ' has its own icon');
  assert(h.calls.length > 12, c.id + ' icon is a scene, not a single stroke');
  sigs[c.id] = JSON.stringify(h.calls.map(function (k) { return k[0]; }));
});
assert.strictEqual(new Set(Object.values(sigs)).size, N.CARDS.length, 'every icon is distinct');
assert.strictEqual(N.drawSkillIcon('nope', '#fff', 0), false, 'unknown id falls back');
console.log('skills ok');
```

- [ ] **Step 2: Run `node tests/skills.test.js` and confirm it fails.** Expect `TypeError: N.drawSkillIcon is not a function`.

- [ ] **Step 3: Implement `drawSkillIcon` and replace all 3 `drawCardGlyph` calls with it**

Use a lookup table `SKILL_ICONS = { id: function (col, t) {...} }` with one entry per subject from Global Constraints. Each icon draws:
1. A rounded badge background (`withAlpha(col, 0.12)`) with a thin rim in `col`.
2. Its scene inside. Ships use `shipPath` scaled ×0.7, enemies use `enemyOutline(ctx, 'grunt', 7)`, and bullets are small ellipses in `PLAYER_LOOK.engine`.
3. The effect accent in `col`.

Unknown ids draw the old hexagon and return `false`. Delete `drawCardGlyph`.

- [ ] **Step 4: Run `node tests/skills.test.js` and `node tests/ships.test.js`.** Both must pass.

- [ ] **Step 5: Visual check in the browser pane.** Run `NEON.G.cards = NEON.CARDS.slice(0, 3); NEON.openUpgrade('level')` and screenshot. Repeat for each slice of 3 until all 20 icons have been seen. Each icon must read as its subject at the card size.

---

### Task 2: Automatic mobile mode with joysticks and action buttons

**Files:**
- Modify: `neon-vanguard.html`, specifically:
  - the `touch` object (~line 395)
  - the touchstart, touchmove and touchEnd handlers (~480-542)
  - `G` (add `mobile`)
  - the HUD draw path (call `drawTouchControls` when `G.mobile && G.state === 'playing'`)
  - the title-screen prompt text: show `TAP TO LAUNCH` when mobile
  - the `window.NEON` exports
- Test: `tests/mobile.test.js` (new)

**Interfaces:**
- Consumes: `tryOverdrive()`, `placeMine()`, `selectWeapon(i)`, and the existing dash latch, triggered by `keys[' ']`.
- Produces:
  - `touchLayout(W, H)`: returns `{ move: {x,y,r}, aim: {x,y,r}, buttons: [{id,x,y,r}] }`. The `id` values are `'dash'|'mine'|'od'|'weapon'|'pause'`. `x,y` is the centre and `r` the radius, in CSS px.
  - `touchButtonAt(x, y)`: returns the `id` or `null`, using the current `W,H`.
  - `pressTouchButton(id)`: runs that button's action.
  - `nextWeapon()`: selects the next unlocked weapon after `p.weapon`, wrapping around. With only one weapon unlocked it does nothing.
  - `drawTouchControls()`: draws both sticks and all buttons.

- [ ] **Step 1: Write the failing test `tests/mobile.test.js`**

```js
var assert = require('assert');
var h = require('./harness').load(__dirname + '/../neon-vanguard.html');
var N = h.N, G = h.G;
function overlap(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r; }
[[360, 640], [844, 390], [1280, 800]].forEach(function (s) {
  var L = N.touchLayout(s[0], s[1]);
  assert.deepStrictEqual(L.buttons.map(function (b) { return b.id; }).sort(), ['dash', 'mine', 'od', 'pause', 'weapon']);
  L.buttons.forEach(function (b, i) {
    assert(b.r * 2 >= 52, b.id + ' big enough');
    assert(b.x - b.r >= 16 && b.x + b.r <= s[0] - 16 && b.y - b.r >= 16 && b.y + b.r <= s[1] - 16, b.id + ' on screen at ' + s);
    assert(!overlap(b, L.move) && !overlap(b, L.aim), b.id + ' clear of sticks at ' + s);
    L.buttons.forEach(function (c, j) { if (i !== j) assert(!overlap(b, c), b.id + '/' + c.id + ' overlap at ' + s); });
  });
});
window.innerWidth = 844; window.innerHeight = 390; N.resize();
var L = N.touchLayout(844, 390), d = L.buttons.filter(function (b) { return b.id === 'dash'; })[0];
assert.strictEqual(N.touchButtonAt(d.x, d.y), 'dash');
assert.strictEqual(N.touchButtonAt(L.move.x, L.move.y), null, 'stick zone is not a button');
N.startGame();
assert.strictEqual(G.player.weapon, 0);
N.nextWeapon(); assert.strictEqual(G.player.weapon, 0, 'only PULSE unlocked: no change');
G.player.unlocked = [true, true, false, true];
N.nextWeapon(); assert.strictEqual(G.player.weapon, 1);
N.nextWeapon(); assert.strictEqual(G.player.weapon, 3, 'skips locked LANCE');
N.nextWeapon(); assert.strictEqual(G.player.weapon, 0, 'wraps');
N.pressTouchButton('pause'); assert.strictEqual(G.state, 'paused');
N.pressTouchButton('pause'); assert.strictEqual(G.state, 'playing', 'pause button toggles');
console.log('mobile ok');
```

- [ ] **Step 2: Run `node tests/mobile.test.js` and confirm it fails.** Expect `TypeError: N.touchLayout is not a function`. Also export `resize`, `nextWeapon`, `pressTouchButton`, `touchButtonAt` and `touchLayout`.

- [ ] **Step 3: Implement the layout, buttons and handlers**

- **`touchLayout`:**
  - **Sticks:** `move` is centred at (`r + 28`, `H - r - 28`) and `aim` mirrors it on the right, with `r = clamp(Math.min(W, H) * 0.16, 48, 80)`.
  - **Right-side buttons:** `dash`, `od` and `mine` form an arc above and left of the aim stick. Each has `r = 30`.
  - **`weapon` and `pause`:** these sit top-right below the score column, at y ≥ 140 so they clear the score HUD.
  - **Small screens:** when the arc would overlap, shrink the spacing, but never let `r` drop below 26.
- **`touchstart`:** check `touchButtonAt` first.
  - On a button: call `pressTouchButton` and record the touch id in `touch.buttons[id]` so its end is ignored. `dash` sets `keys[' '] = true` until that finger lifts.
  - Otherwise: keep the current half-screen stick assignment, but centre each stick where the finger first lands (floating joystick).
- **`touchEnd`:** releases only the matching stick or button by touch identifier.
- **While `paused`:** any tap resumes play.
- **`G.mobile`:** set once at boot from the detection rule in Global Constraints.
- **`drawTouchControls`:** draws the two stick rings with their knobs at the current offset, and each button with an icon. Reuse `drawSkillIcon('dash'|'mine'|'od')` from Task 1 for those three, a 4-bar weapon pip for `weapon`, and `II` for `pause`. A button not available yet (no dash charges, no mines, overdrive not ready) draws at alpha 0.35.

- [ ] **Step 4: Run all tests.** `node tests/mobile.test.js`, `node tests/skills.test.js` and `node tests/ships.test.js` must all pass.

- [ ] **Step 5: Check it on a phone-sized screen in the browser pane**
1. Use `resize_window` with preset `mobile`, then reload. The title must say `TAP TO LAUNCH` and gameplay must show both sticks and all 5 buttons.
2. Take screenshots in portrait, then at 844×390 (landscape).
3. Using `javascript_tool`, dispatch synthetic `TouchEvent`s:
   - **Hold the left stick while tapping DASH:** the player keeps moving after the DASH finger lifts.
   - **Pause:** tapping the pause button pauses, and a tap anywhere resumes.
4. Reset with preset `desktop` and confirm the desktop view shows no touch controls.
