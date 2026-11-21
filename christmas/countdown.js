/*
 * Countdown to Christmas for /christmas/.
 *
 * Counts down to the start of Christmas Day, midnight Mountain Time on December 25. In December Mountain Time is
 * UTC-7, so that moment is 07:00 UTC. During Christmas Day it shows a greeting, and from December 26 it counts down to
 * the next Christmas.
 *
 * Preview any moment with ?now=, for example ?now=2026-12-24T23:59:50-07:00 or ?now=2026-12-25T12:00:00-07:00. The
 * clock keeps running from that moment.
 *
 * The page has a plain sentence in place of the clock, which stays if this script does not run. The ticking numbers are
 * hidden from screen readers, which get one line that is updated once a minute.
 */
(function () {
  'use strict';
  try {
    var root = document.getElementById('countdown');
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    var offset = 0;
    var override = Date.parse(params.get('now') || '');
    if (!isNaN(override)) offset = override - Date.now();

    var units = {};
    root.querySelectorAll('[data-unit]').forEach(function (el) { units[el.getAttribute('data-unit')] = el; });
    var message = root.querySelector('.countdown-message');
    var caption = document.getElementById('countdown-caption');
    var title = document.getElementById('countdown-title');
    var summary = document.getElementById('countdown-summary');
    if (!units.days || !units.hours || !units.minutes || !units.seconds) throw new Error('countdown markup missing');

    var yearFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', year: 'numeric' });
    function christmasStart(year) { return Date.UTC(year, 11, 25, 7, 0, 0); }
    function christmasEnd(year) { return Date.UTC(year, 11, 26, 7, 0, 0); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

    var lastText = {};
    function set(name, text) {
      if (lastText[name] === text) return;
      lastText[name] = text;
      units[name].textContent = text;
    }

    var lastSummary = '';
    function render() {
      var now = Date.now() + offset;
      var year = parseInt(yearFormat.format(now), 10);
      var isChristmas = now >= christmasStart(year) && now < christmasEnd(year);
      var targetYear = now >= christmasEnd(year) ? year + 1 : year;
      var thisYearsChristmas = targetYear === year;

      root.classList.add('is-live');
      root.classList.toggle('is-christmas', isChristmas);
      if (message) message.hidden = !isChristmas;
      if (title) title.textContent = isChristmas ? 'Christmas is here' : 'Christmas is coming';

      if (isChristmas) {
        if (caption) caption.textContent = 'Thank you for being part of our community.';
        summary.textContent = 'It is Christmas Day. Merry Christmas, Colorado!';
        return;
      }

      var diff = Math.max(0, christmasStart(targetYear) - now);
      var seconds = Math.floor(diff / 1000);
      var days = Math.floor(seconds / 86400);
      var hours = Math.floor((seconds % 86400) / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);
      set('days', String(days));
      set('hours', pad(hours));
      set('minutes', pad(minutes));
      set('seconds', pad(seconds % 60));

      if (caption) {
        caption.textContent = 'until Christmas Day' + (thisYearsChristmas ? ', December 25' : ' ' + targetYear);
      }
      var text = plural(days, 'day') + ', ' + plural(hours, 'hour') + ' and ' + plural(minutes, 'minute') +
        ' until Christmas Day' + (thisYearsChristmas ? '' : ' ' + targetYear) + '.';
      if (text !== lastSummary) { lastSummary = text; summary.textContent = text; }   // changes once a minute
    }

    render();
    window.setInterval(render, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  } catch (error) {
    // The plain sentence stays in place of the clock.
  }
})();
