var assert = require('assert');
var h = require('./harness').load(__dirname + '/../index.html');
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
