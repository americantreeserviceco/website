// Site-wide severe weather banner for the Denver metro / Golden area.
// Shows only while the National Weather Service has an active alert that matters for trees.
// Preview without waiting for a storm: add ?alert=test to any URL.
(function () {
  var API = 'https://api.weather.gov/alerts/active?point=';
  var POINTS = ['39.7555,-105.2211', '39.7392,-104.9903', '40.0150,-105.2705']; // Golden, Denver, Boulder
  var RELEVANT = /^(Tornado|Severe Thunderstorm|High Wind|Extreme Wind|Wind Advisory|Winter Storm|Blizzard|Ice Storm|Heavy Snow|Winter Weather Advisory|Red Flag)/i;
  var ADVISORY = /^(Wind Advisory|Winter Weather Advisory)/i;
  var RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };
  var PHONE = '(303) 456-6898';
  var PHONE_HREF = 'tel:+13034566898';
  var HELP_URL = '/services/rapid-hazard-response/index.html';

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.style.cssText = style;
    if (text != null) n.textContent = text;
    return n;
  }

  function fetchPoint(point) {
    return fetch(API + point, { headers: { Accept: 'application/geo+json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return j.features.map(function (f) { return f.properties; }); })
      .catch(function () { return []; });
  }

  function pickAlert(all) {
    var seen = {};
    var list = all.filter(function (a) {
      if (seen[a.id]) return false;
      seen[a.id] = true;
      // Wind and winter weather advisories are rated Minor by NWS but still matter for trees.
      return RELEVANT.test(a.event || '') && ((RANK[a.severity] || 0) >= 2 || ADVISORY.test(a.event));
    });
    list.sort(function (a, b) { return (RANK[b.severity] || 0) - (RANK[a.severity] || 0); });
    return list[0] || null;
  }

  function dismissed(id) {
    try { return sessionStorage.getItem('alert-dismissed:' + id) === '1'; } catch (e) { return false; }
  }

  function show(alert) {
    var urgent = /warning/i.test(alert.event) || alert.severity === 'Extreme';
    var bar = el('div', 'position:relative;z-index:10000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 16px;padding:10px 44px 10px 16px;font:600 15px/1.35 system-ui,sans-serif;text-align:center;' +
      (urgent ? 'background:#b91c1c;color:#fff;' : 'background:#f59e0b;color:#1f1300;'));
    bar.setAttribute('role', 'alert');

    var msg = el('span', null);
    msg.appendChild(el('strong', null, alert.event + ' in effect'));
    if (alert.expires) {
      var t = new Date(alert.expires).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      msg.appendChild(document.createTextNode(' until ' + t));
    }
    msg.appendChild(document.createTextNode('. Storm-damaged or hazardous tree? '));
    bar.appendChild(msg);

    var call = el('a', 'color:inherit;text-decoration:underline;white-space:nowrap;', 'Call ' + PHONE);
    call.href = PHONE_HREF;
    bar.appendChild(call);
    var help = el('a', 'color:inherit;text-decoration:underline;white-space:nowrap;', 'Emergency tree help');
    help.href = HELP_URL;
    bar.appendChild(help);

    var close = el('button', 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:inherit;font-size:24px;line-height:1;cursor:pointer;padding:4px 10px;', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss weather alert');
    close.addEventListener('click', function () {
      try { sessionStorage.setItem('alert-dismissed:' + alert.id, '1'); } catch (e) { /* ignore */ }
      bar.remove();
    });
    bar.appendChild(close);

    document.body.insertBefore(bar, document.body.firstChild);
  }

  function run() {
    if (new URLSearchParams(location.search).get('alert') === 'test') {
      return show({ id: 'test', event: 'High Wind Warning', severity: 'Severe', expires: new Date(Date.now() + 6 * 3600e3).toISOString() });
    }
    Promise.all(POINTS.map(fetchPoint)).then(function (r) {
      var alert = pickAlert([].concat.apply([], r));
      if (alert && !dismissed(alert.id)) show(alert);
    });
  }

  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
})();
