/*
 * Falling snow for the /christmas/ pages.
 *
 * One fixed canvas sits over the page and ignores clicks. Most flakes are soft dots; a few are six-armed crystals
 * that turn slowly as they fall. Each flake has a thin blue-grey outline so it still shows on the cream sections.
 * Does nothing for visitors who prefer reduced motion, and pauses while the tab is hidden (requestAnimationFrame).
 */
(function () {
  'use strict';
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'snowfall';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    document.body.appendChild(canvas);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var flakes = [];

    function makeFlake(anywhere) {
      var crystal = Math.random() < 0.16;
      var size = crystal ? 6 + Math.random() * 6 : 1.6 + Math.random() * 2.8;
      return {
        crystal: crystal,
        size: size,
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : -size * 2,
        fall: (crystal ? 22 : 30) + size * 5 + Math.random() * 18,   // pixels per second, larger flakes fall faster
        sway: 10 + Math.random() * 22,
        swaySpeed: 0.4 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.9
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
      // About one flake per 22,000 square pixels, between 28 and 90.
      var target = Math.round(Math.min(90, Math.max(28, (width * height) / 22000)));
      while (flakes.length < target) flakes.push(makeFlake(true));
      if (flakes.length > target) flakes.length = target;
    }

    function drawCrystal(f) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.lineCap = 'round';
      [[3.4, 'rgba(60, 100, 145, 0.45)'], [1.7, 'rgba(255, 255, 255, 0.96)']].forEach(function (pass) {
        ctx.lineWidth = pass[0];
        ctx.strokeStyle = pass[1];
        ctx.beginPath();
        for (var arm = 0; arm < 6; arm++) {
          ctx.save();
          ctx.rotate(arm * Math.PI / 3);
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -f.size);
          ctx.moveTo(0, -f.size * 0.55);
          ctx.lineTo(f.size * 0.3, -f.size * 0.8);
          ctx.moveTo(0, -f.size * 0.55);
          ctx.lineTo(-f.size * 0.3, -f.size * 0.8);
          ctx.restore();
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawDot(f) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(60, 100, 145, 0.35)';
      ctx.stroke();
    }

    var last = 0;
    var clock = 0;
    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;   // cap the step after a pause
      last = now;
      clock += dt;
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.fall * dt;
        f.x += Math.cos(clock * f.swaySpeed + f.phase) * f.sway * dt;
        f.angle += f.spin * dt;
        if (f.y - f.size * 2 > height || f.x < -30 || f.x > width + 30) {
          flakes[i] = makeFlake(false);
          flakes[i].x = Math.random() * width;
          continue;
        }
        if (f.crystal) drawCrystal(f); else drawDot(f);
      }
      window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    window.requestAnimationFrame(frame);
  } catch (error) {
    // Decoration only: ignore failures.
  }
})();
