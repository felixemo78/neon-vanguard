// Headless loader: evals the game script against a recording stub canvas.
var fs = require('fs');

exports.load = function (htmlPath) {
  var src = fs.readFileSync(htmlPath, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
  var calls = [];
  var ctx = new Proxy(function () {}, {
    get: function (t, k) {
      if (k === 'measureText') return function (s) { return { width: String(s).length * 6 }; };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') {
        return function () { return { addColorStop: function (o, c) { calls.push(['addColorStop', [o, c]]); } }; };
      }
      if (k === 'getContext') return function () { return ctx; };
      if (k in t) return t[k];
      return function () { calls.push([k, Array.prototype.slice.call(arguments)]); };
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
  var canvas = { getContext: function () { return ctx; }, width: 0, height: 0, style: {}, classList: { contains: function () { return false; }, toggle: function () {} }, addEventListener: function () {}, getBoundingClientRect: function () { return { left: 0, top: 0 }; } };
  var listeners = {};
  global.window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, localStorage: { getItem: function () { return null; }, setItem: function () {} },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); } };
  global.document = { getElementById: function () { return canvas; }, createElement: function () { return { getContext: function () { return ctx; }, width: 0, height: 0 }; } };
  global.requestAnimationFrame = function () {};
  (0, eval)(src);
  var N = global.window.NEON, t = 0;
  return {
    N: N, G: N.G, ctx: ctx, calls: calls,
    frame: function (n) { for (var i = 0; i < n; i++) { t += 16.7; N.frame(t); } },
    // fires a window keyboard event, e.g. key('keydown', ' ')
    key: function (type, k) { (listeners[type] || []).forEach(function (fn) { fn({ key: k, code: '', preventDefault: function () {} }); }); }
  };
};
