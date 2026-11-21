/*
 * Blowing autumn leaves for the homepage.
 *
 * Follows the same seasonal logic as the other themes: on in October (Halloween theme) and November (November theme),
 * or when ?theme=halloween or ?theme=november is in the address. Add ?leaves=on to see it in any month. It is off in
 * the winter theme, so it never meets the December snow and Santa.
 *
 * One fixed canvas sits over the page and ignores clicks. Three leaf shapes (maple, oak and a round aspen leaf) are
 * drawn once into small sprites, then moved by a wind that swells and fades so the leaves are pushed along in gusts,
 * tumble, and flip edge-on as they go. It does nothing for visitors who prefer reduced motion and pauses while the
 * tab is hidden.
 */
(function () {
  'use strict';
  try {
    var params = new URLSearchParams(window.location.search);
    var override = params.get('theme');
    // Share one month snapshot with the theme scripts so they agree across a midnight change.
    var month = window.__americanTreeThemeMonth != null
      ? window.__americanTreeThemeMonth
      : (window.__americanTreeThemeMonth = new Date().getMonth());
    var autumn = override ? (override === 'halloween' || override === 'november') : (month === 9 || month === 10);
    if (!autumn && params.get('leaves') !== 'on') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    // Under the sticky header (z-index 1000) and over the page content.
    canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:900';
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    document.body.appendChild(canvas);

    var COLORS = ['#b3261e', '#c8461f', '#d9731a', '#e08a24', '#e0a526', '#d4af37', '#a8541d', '#8a4b1f'];
    var SPRITE = 64;

    // Outline of a leaf pointing up, as points in the range -1 to 1.
    function mapleOutline() {
      var points = [];
      for (var i = 0; i < 120; i++) {
        var angle = (i / 120) * Math.PI * 2;
        var lobe = Math.pow(Math.abs(Math.cos(2.5 * (angle - Math.PI / 2))), 1.5);
        var radius = 0.34 + 0.66 * lobe;
        points.push([Math.cos(angle) * radius, -Math.sin(angle) * radius]);
      }
      return points;
    }
    function oakOutline() {
      var points = [];
      for (var i = 0; i < 120; i++) {
        var angle = (i / 120) * Math.PI * 2;
        var wave = 1 + 0.16 * Math.sin(angle * 7);
        points.push([Math.cos(angle) * 0.55 * wave, Math.sin(angle) * 0.95 * wave]);
      }
      return points;
    }
    function aspenOutline() {
      var points = [];
      for (var i = 0; i < 120; i++) {
        var angle = (i / 120) * Math.PI * 2;
        var x = Math.cos(angle) * 0.82;
        var y = Math.sin(angle) * 0.78;
        if (y < 0) y -= (1 - Math.abs(Math.cos(angle))) * 0.28;   // pointed tip at the top
        points.push([x, y]);
      }
      return points;
    }

    function makeSprite(outline, color) {
      var c = document.createElement('canvas');
      c.width = c.height = SPRITE;
      var g = c.getContext('2d');
      var half = SPRITE / 2;
      g.translate(half, half);
      g.scale(half * 0.86, half * 0.86);
      g.beginPath();
      outline.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
      g.closePath();
      g.fillStyle = color;
      g.fill();
      g.lineWidth = 0.06;
      g.strokeStyle = 'rgba(60, 25, 8, 0.55)';
      g.stroke();
      // Stem and a central vein.
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(60, 25, 8, 0.6)';
      g.lineWidth = 0.07;
      g.beginPath();
      g.moveTo(0, 1.0);
      g.lineTo(0, -0.62);
      g.stroke();
      g.lineWidth = 0.035;
      g.strokeStyle = 'rgba(255, 235, 190, 0.35)';
      for (var side = -1; side <= 1; side += 2) {
        for (var k = 0; k < 3; k++) {
          var y0 = 0.3 - k * 0.3;
          g.beginPath();
          g.moveTo(0, y0);
          g.lineTo(side * 0.38, y0 - 0.3);
          g.stroke();
        }
      }
      return c;
    }

    var outlines = [mapleOutline(), mapleOutline(), oakOutline(), aspenOutline()];   // maples are the most common
    var sprites = [];
    outlines.forEach(function (outline) {
      COLORS.forEach(function (color) { sprites.push(makeSprite(outline, color)); });
    });

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var leaves = [];

    function makeLeaf(anywhere) {
      var size = 26 + Math.random() * 30;
      return {
        sprite: sprites[Math.floor(Math.random() * sprites.length)],
        size: size,
        weight: 0.7 + Math.random() * 0.6,                 // light leaves are pushed harder by the wind
        x: anywhere ? Math.random() * width : -size * 2,
        y: anywhere ? Math.random() * height : Math.random() * height * 0.8,
        vx: 40 + Math.random() * 60,
        vy: 20 + Math.random() * 30,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3,
        flipPhase: Math.random() * Math.PI * 2,
        flipSpeed: 1.5 + Math.random() * 2.5,
        flutter: Math.random() * Math.PI * 2,
        flutterSpeed: 1.2 + Math.random() * 1.5
      };
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // About one leaf per 34,000 square pixels, between 14 and 44.
      var target = Math.round(Math.min(44, Math.max(14, (width * height) / 34000)));
      while (leaves.length < target) leaves.push(makeLeaf(true));
      if (leaves.length > target) leaves.length = target;
    }

    // Wind pushes left to right. It swells and fades in slow waves, with a stronger gust now and then.
    function windAt(t) {
      var swell = 0.5 + 0.5 * Math.sin(t * 0.33);
      var gust = Math.max(0, Math.sin(t * 0.9 + 1.3) * Math.sin(t * 0.21));
      return 55 + 110 * swell + 190 * gust;
    }

    var last = 0;
    var clock = 0;
    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      clock += dt;
      var wind = windAt(clock);
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 0.92;
      for (var i = 0; i < leaves.length; i++) {
        var f = leaves[i];
        // Horizontal speed chases the wind, so a gust takes a moment to arrive and to die away.
        f.vx += (wind * f.weight - f.vx) * Math.min(1, 1.6 * dt);
        // Falling, a flutter from side to side, and a lift when a gust is strong.
        f.flutter += f.flutterSpeed * dt;
        var lift = Math.max(0, wind - 170) * 0.55;
        f.vy += ((28 + 22 * f.weight - lift) + Math.sin(f.flutter) * 26 - f.vy) * Math.min(1, 1.2 * dt);
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.angle += (f.spin + wind * 0.012) * dt;
        f.flipPhase += f.flipSpeed * dt * (0.6 + wind / 160);
        if (f.x > width + f.size * 2 || f.y > height + f.size * 2 || f.y < -height * 0.4) {
          leaves[i] = makeLeaf(false);
          continue;
        }
        var flip = 0.28 + 0.72 * Math.abs(Math.cos(f.flipPhase));   // edge-on at the narrowest, never fully flat
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.scale(flip, 1);
        ctx.drawImage(f.sprite, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    window.requestAnimationFrame(frame);
  } catch (error) {
    // Decoration only: ignore failures.
  }
})();
