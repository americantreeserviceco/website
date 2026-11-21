/*
 * Advent calendar for /christmas/12-days-of-tree-care/.
 *
 * The page ships with every tip in the HTML, so it reads fine without JavaScript. When this script runs it hides
 * the tips and reveals each one when its door is opened. Doors release at midnight Mountain Time, December 13-24,
 * 2026. After December 24 every tip is open.
 *
 * Preview overrides (for review before the campaign starts):
 *   ?date=2026-12-15   pretend today is that date
 *   ?preview=all       open every door, as after the campaign
 *
 * Opened doors are remembered in localStorage on the visitor's own device. Storage can be unavailable, so every
 * read and write is wrapped and the calendar still works without it.
 */
(function () {
  'use strict';

  var root = document.documentElement;

  try {
    var YEAR = 2026;
    var FIRST_DAY = 13; // December 13 releases door 1
    var DAYS = 12;
    var STORAGE_KEY = 'atc-advent-opened-2026';

    var doors = Array.prototype.slice.call(document.querySelectorAll('.door'));
    var tips = {};
    document.querySelectorAll('.tip').forEach(function (tip) {
      var n = parseInt(tip.id.replace('day-', ''), 10);
      if (n) tips[n] = tip;
    });
    var statusEl = document.getElementById('advent-status');
    var noteEl = document.getElementById('advent-note');
    var emptyEl = document.getElementById('advent-empty');
    if (!doors.length || !statusEl) throw new Error('advent markup missing');

    var params = new URLSearchParams(location.search);
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function releaseKey(day) { return YEAR + '-12-' + pad(FIRST_DAY + day - 1); }
    var lastKey = releaseKey(DAYS);

    // Today's date in Mountain Time as YYYY-MM-DD, unless a preview date is given.
    function todayKey() {
      var override = params.get('date');
      if (/^\d{4}-\d{2}-\d{2}$/.test(override || '')) return override;
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    }

    function dateFor(day) { return new Date(Date.UTC(YEAR, 11, FIRST_DAY + day - 1)); }
    var shortFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
    var longFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

    var opened = {};
    try {
      JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').forEach(function (n) {
        if (n >= 1 && n <= DAYS) opened[n] = true;
      });
    } catch (e) { /* storage unavailable or corrupt: start with nothing opened */ }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(opened).map(Number)));
      } catch (e) { /* ignore */ }
    }

    function titleOf(day) {
      var h = tips[day] && tips[day].querySelector('h2');
      return h ? h.textContent.trim() : 'Tip ' + day;
    }

    function render() {
      var today = todayKey();
      var archive = params.get('preview') === 'all' || today > lastKey;
      var released = 0;
      var shown = 0;

      doors.forEach(function (door) {
        var day = parseInt(door.dataset.day, 10);
        var isReleased = archive || today >= releaseKey(day);
        var isOpen = isReleased && (archive || !!opened[day]);
        if (isReleased) released += 1;
        if (isOpen) shown += 1;

        door.classList.toggle('is-locked', !isReleased);
        door.classList.toggle('is-ready', isReleased && !isOpen);
        door.classList.toggle('is-opened', isOpen);
        door.setAttribute('aria-disabled', isReleased ? 'false' : 'true');

        var status = door.querySelector('.door-status');
        if (!isReleased) status.textContent = 'Opens ' + shortFmt.format(dateFor(day));
        else if (!isOpen) status.textContent = 'Open door';
        else status.textContent = archive ? 'Tip ' + day : 'Opened';

        door.setAttribute('aria-label', 'Door ' + day + ': ' + (isReleased ? titleOf(day) : 'opens ' + longFmt.format(dateFor(day))));

        if (tips[day]) tips[day].classList.toggle('is-open', isOpen);
      });

      if (emptyEl) emptyEl.hidden = shown > 0;

      if (archive) {
        statusEl.textContent = 'The countdown has ended. All 12 tips are open below.';
      } else if (released === 0) {
        statusEl.textContent = 'The countdown starts ' + longFmt.format(dateFor(1)) + '. Come back then to open door 1.';
      } else {
        statusEl.textContent = released + ' of 12 doors are ready. Open a door to reveal its tip.';
      }
    }

    function note(message) {
      if (!noteEl) return;
      noteEl.textContent = '';
      // Re-set on the next frame so a repeated message is announced again.
      window.requestAnimationFrame(function () { noteEl.textContent = message; });
    }

    function open(day, scroll) {
      var archive = params.get('preview') === 'all' || todayKey() > lastKey;
      if (!archive && todayKey() < releaseKey(day)) {
        note('Door ' + day + ' opens on ' + longFmt.format(dateFor(day)) + '.');
        return;
      }
      opened[day] = true;
      save();
      render();
      var tip = tips[day];
      if (!tip || !scroll) return;
      tip.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      var heading = tip.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }

    doors.forEach(function (door) {
      door.addEventListener('click', function (event) {
        event.preventDefault();
        open(parseInt(door.dataset.day, 10), true);
      });
    });

    function openFromHash() {
      var match = /^#day-(\d+)$/.exec(location.hash);
      if (!match) return;
      var day = parseInt(match[1], 10);
      if (day >= 1 && day <= DAYS) open(day, true);
    }

    root.classList.add('advent-js');
    window.__adventReady = true;
    render();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    // Doors unlock at midnight even if the page is left open.
    window.setInterval(render, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  } catch (error) {
    // If anything fails, fall back to showing every tip.
    root.classList.remove('advent-js');
    if (window.console) console.warn('Advent calendar disabled:', error);
  }
})();
