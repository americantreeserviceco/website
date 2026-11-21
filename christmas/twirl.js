/*
 * Ornament twirl on /christmas/: each ornament in the wheel promo turns once around its vertical axis as it
 * scrolls into view, and again when hovered or tapped. Does nothing for visitors who prefer reduced motion.
 */
(function () {
  'use strict';
  try {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.wheel-ornaments img'));
    if (!imgs.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function twirl(img) {
      // Use the 3D spin when it can run; otherwise fall back to the flat CSS turn below.
      if (window.OrnamentSpin && window.OrnamentSpin.spin(img)) return;
      if (img.classList.contains('is-twirling')) return;
      img.classList.add('is-twirling');
      img.addEventListener('animationend', function () { img.classList.remove('is-twirling'); }, { once: true });
    }

    imgs.forEach(function (img) {
      img.addEventListener('mouseenter', function () { twirl(img); });
      img.addEventListener('click', function () { twirl(img); });
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var index = imgs.indexOf(entry.target);
          window.setTimeout(function () { twirl(entry.target); }, index * 180);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.6 });
      imgs.forEach(function (img) { observer.observe(img); });
    }
  } catch (error) {
    // Decoration only: ignore failures.
  }
})();
