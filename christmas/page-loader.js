/*
 * Page-load overlay for the /christmas/ pages. Load this in <head>, before the page is drawn.
 *
 * It marks the page as loading (.has-loader on <html>) and shows the spinner overlay only if loading is still going on
 * after a quarter of a second, so a quick load never flashes it. Once shown, it stays for at least 0.45 seconds so it
 * does not flicker, then fades out and the markers are removed.
 *
 * "Loaded" means the browser's load event, or the page's own images (apart from lazy ones) having arrived once the HTML
 * is parsed, whichever comes first. Some pages keep the load event waiting on their own start-up work long after
 * everything the visitor can see is there. If neither happens the overlay is dismissed after 4 seconds so a visitor is
 * never stuck behind it.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var finished = false;
  var showTimer = 0;
  var shownAt = 0;

  function clear() {
    root.classList.remove('has-loader', 'loader-visible');
  }

  // True once every image in the page has arrived, ignoring lazy ones that may be far below the fold.
  function imagesArrived() {
    var images = document.images;
    for (var i = 0; i < images.length; i++) {
      if (!images[i].complete && images[i].loading !== 'lazy') return false;
    }
    return true;
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.clearTimeout(showTimer);
    if (!shownAt) { clear(); return; }                // it never appeared, so there is nothing to fade
    var wait = Math.max(0, 450 - (Date.now() - shownAt));
    window.setTimeout(function () {
      root.classList.remove('loader-visible');        // fades out
      window.setTimeout(clear, 450);                  // then the overlay stops existing
    }, wait);
  }

  try {
    root.classList.add('has-loader');
    showTimer = window.setTimeout(function () {
      if (finished) return;
      shownAt = Date.now();
      root.classList.add('loader-visible');
    }, 250);
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish);
    document.addEventListener('DOMContentLoaded', function check() {
      if (finished) return;
      if (imagesArrived()) finish(); else window.setTimeout(check, 100);
    });
    window.setTimeout(finish, 4000);
    // A page restored from the back/forward cache is already loaded.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) { finished = true; clear(); }
    });
  } catch (error) {
    clear();
  }
})();
