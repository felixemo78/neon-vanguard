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
console.log('input ok');
