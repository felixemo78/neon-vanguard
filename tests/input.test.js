var assert = require('assert');
var h = require('./harness').load(__dirname + '/../index.html');
var N = h.N, G = h.G;

function setup() {
  N.startGame();
  G.spawnQueue = []; G.enemies = [];
  var e = N.spawnEnemy('grunt', 20, 20); e.spawn = 0; e.hp = e.maxHp = 1e9; e.fireCd = 1e9; e.spd = 0; // keeps the wave open
  G.player.inv = 1e9;
  G.player.dashCharges = 1; G.player.dashTimer = 999; G.player.dashRecharge = 999;
}

// baseline: a tap that spans a frame dashes
setup(); h.frame(2);
h.key('keydown', ' '); h.frame(1); h.key('keyup', ' '); h.frame(2);
assert.strictEqual(G.player.dashCharges, 0, 'normal tap dashes');

// bug: a tap made and released inside a hit-stop freeze must still dash once the freeze ends
setup(); h.frame(2);
G.hitStop = 0.16;
h.key('keydown', ' '); h.frame(2); h.key('keyup', ' ');
h.frame(15);
assert.strictEqual(G.player.dashCharges, 0, 'tap during hit-stop still dashes');

// a single press must not dash twice, even with a spare charge
setup(); G.player.dashCharges = 2; G.player.dashMax = 2; h.frame(2);
h.key('keydown', ' '); h.frame(20); h.key('keyup', ' '); h.frame(2);
assert.strictEqual(G.player.dashCharges, 1, 'holding space dashes once');

// mobile DASH button: tap and lift inside a hit-stop
setup(); h.frame(2);
G.hitStop = 0.16;
N.pressTouchButton('dash'); h.frame(2); h.key('keyup', ' ');
h.frame(15);
assert.strictEqual(G.player.dashCharges, 0, 'mobile dash tap during hit-stop still dashes');
// every skill moment plays its sound (spy on the shared sfx table)
var played = [];
['dash', 'mine', 'mineArm', 'overdrive', 'odEnd', 'denied'].forEach(function (k) { N.sfx[k] = function () { played.push(k); }; });
setup(); h.frame(2);
h.key('keydown', ' '); h.frame(1); h.key('keyup', ' '); h.frame(1);
assert(played.indexOf('dash') >= 0, 'dash sound');
played = [];
h.key('keydown', ' '); h.frame(1); h.key('keyup', ' '); h.frame(1);
assert(played.indexOf('denied') >= 0, 'dash with no charges buzzes');
played = [];
N.placeMine(); h.frame(30);
assert(played.indexOf('mine') >= 0 && played.indexOf('mineArm') >= 0, 'mine plant and arm sounds');
G.player.mines = 0; played = [];
N.placeMine();
assert.deepStrictEqual(played, ['denied'], 'no mines left buzzes');
played = [];
N.tryOverdrive();
assert.deepStrictEqual(played, ['denied'], 'overdrive not ready buzzes');
G.player.odReady = true; played = [];
N.tryOverdrive(); h.frame(60 * 9);
assert(played.indexOf('overdrive') >= 0 && played.indexOf('odEnd') >= 0, 'overdrive start and end sounds');
console.log('input ok');
