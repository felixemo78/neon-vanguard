var assert = require('assert');
var h = require('./harness').load(__dirname + '/../index.html');
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
assert(w.bank > 0, 'wrap keeps turn direction');
var o2 = { bank: 0 };
N.steerBank(o2, 0, 1 / 60);
N.steerBank(o2, 0, 0);
assert(isFinite(o2.bank), 'dt 0 keeps bank finite');
console.log('task3 ok');

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
[undefined, 'nope'].forEach(function (hk) {
  h.calls.length = 0;
  N.enemyOutline(h.ctx, 'boss', 72, hk);
  assert.strictEqual(JSON.stringify(h.calls), sigs[0], 'hull ' + hk + ' falls back to carrier');
});
console.log('task4 ok');

var L = N.PLAYER_LOOK;
var taken = Object.keys(N.ETYPES).map(function (t) { return N.ETYPES[t].color.toLowerCase(); })
  .concat(N.BOSSES.map(function (b) { return b.color.toLowerCase(); }));
[L.hull, L.trim, L.engine].forEach(function (c) { assert(taken.indexOf(c) < 0, c + ' is player-only'); });
N.startGame();
assert.strictEqual(G.contrail.length, 0, 'contrail resets');
G.player.inv = 99;
for (var k = 0; k < 120; k++) { G.player.vx = 300; G.player.vy = 0; h.frame(1); }
assert(G.contrail.length > 0 && G.contrail.length <= 60, 'contrail grows and is capped');
console.log('task5 ok');

// sprite cache: a repeat look is a single blit, not a vector redraw; flash stays live
var look = { livery: 1, wing: 1, bank: 0.4, hull: undefined };
N.drawCraft('dodger', 12, '#22d3ee', look, false);
h.calls.length = 0;
N.drawCraft('dodger', 12, '#22d3ee', look, false);
assert(h.calls.some(function (c) { return c[0] === 'drawImage'; }), 'cached look blits');
assert(!h.calls.some(function (c) { return c[0] === 'fill' || c[0] === 'stroke'; }), 'cached look skips vector drawing');
h.calls.length = 0;
N.drawCraft('dodger', 12, '#22d3ee', look, true);
assert(h.calls.some(function (c) { return c[0] === 'fill'; }), 'hit flash draws live');
h.calls.length = 0;
N.drawCraft('bomber', 15, '#fb7185', { livery: 0, wing: 1, bank: 0, fuse: 0.3 }, false);
assert(h.calls.some(function (c) { return c[0] === 'fill'; }), 'bomber fuse draws live');
console.log('sprites ok');
