var assert = require('assert');
var h = require('./harness').load(__dirname + '/../index.html');
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
G.mobile = true; h.frame(3); // drawTouchControls runs without throwing
console.log('mobile ok');
