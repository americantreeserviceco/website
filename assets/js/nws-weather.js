// NWS weather widget for location landing pages.
// Usage: <div data-nws-weather data-lat="39.7555" data-lon="-105.2211" data-city="Golden"></div>
// Uses the free api.weather.gov (no key). Coordinates should have <= 4 decimals.
(function () {
  var API = 'https://api.weather.gov';
  var CACHE_MS = 10 * 60 * 1000;
  var DAYS_SHOWN = 5;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function getJSON(url, attempt) {
    attempt = attempt || 0;
    return fetch(url, { headers: { Accept: 'application/geo+json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('NWS ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        // NWS occasionally returns transient 5xx errors; retry once.
        if (attempt < 1) {
          return new Promise(function (resolve) { setTimeout(resolve, 1000); })
            .then(function () { return getJSON(url, attempt + 1); });
        }
        throw err;
      });
  }

  function cached(key, loader) {
    try {
      var hit = JSON.parse(sessionStorage.getItem(key));
      if (hit && Date.now() - hit.t < CACHE_MS) return Promise.resolve(hit.v);
    } catch (e) { /* storage unavailable */ }
    return loader().then(function (value) {
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch (e) { /* ignore */ }
      return value;
    });
  }

  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  function val(q) { return q && q.value != null ? q.value : null; }
  function cToF(c) { return Math.round(c * 9 / 5 + 32); }

  // Latest real observation from the nearest reporting station (tries up to 3).
  function observe(stationsUrl) {
    return getJSON(stationsUrl).then(function (list) {
      var stations = list.features.slice(0, 3);
      function next(i) {
        if (i >= stations.length) return null;
        return getJSON(stations[i].id + '/observations/latest')
          .then(function (obs) {
            var o = obs.properties;
            if (val(o.temperature) == null) return next(i + 1);
            var feels = val(o.heatIndex) != null ? val(o.heatIndex) : val(o.windChill);
            var kmh = val(o.windSpeed);
            var deg = val(o.windDirection);
            return {
              temp: cToF(val(o.temperature)),
              feelsLike: feels != null ? cToF(feels) : null,
              desc: o.textDescription || '',
              icon: o.icon,
              humidity: val(o.relativeHumidity) != null ? Math.round(val(o.relativeHumidity)) : null,
              wind: kmh != null ? (kmh < 1 ? 'Calm' : (deg != null ? COMPASS[Math.round(deg / 22.5) % 16] + ' ' : '') + Math.round(kmh * 0.621371) + ' mph') : null,
              time: o.timestamp,
              station: stations[i].properties.name
            };
          })
          .catch(function () { return next(i + 1); });
      }
      return next(0);
    });
  }

  function fromForecast(h) {
    return {
      temp: h.temperature,
      feelsLike: null,
      desc: h.shortForecast,
      icon: h.icon,
      humidity: val(h.relativeHumidity),
      wind: ((h.windDirection || '') + ' ' + h.windSpeed).trim(),
      time: h.startTime,
      station: null
    };
  }

  function load(lat, lon) {
    return cached('nws2:' + lat + ',' + lon, function () {
      return getJSON(API + '/points/' + lat + ',' + lon).then(function (point) {
        var props = point.properties;
        return Promise.all([
          getJSON(props.forecast),
          getJSON(props.forecastHourly),
          getJSON(API + '/alerts/active?point=' + lat + ',' + lon).catch(function () { return { features: [] }; }),
          observe(props.observationStations).catch(function () { return null; })
        ]).then(function (r) {
          var hourly = r[1].properties.periods;
          return {
            daily: r[0].properties.periods,
            current: r[3] || fromForecast(hourly[0]),
            precip: val(hourly[0].probabilityOfPrecipitation),
            alerts: r[2].features.map(function (f) { return f.properties; })
          };
        });
      });
    });
  }

  function icon(url) {
    var img = el('img', 'h-14 w-14 rounded-full');
    if (url) img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    return img;
  }

  function dayCards(periods) {
    var cards = [];
    for (var i = 0; i < periods.length && cards.length < DAYS_SHOWN; i++) {
      var p = periods[i];
      var next = periods[i + 1];
      var low = null;
      if (p.isDaytime && next && !next.isDaytime) { low = next.temperature; i++; }
      cards.push({ period: p, low: low });
    }
    return cards;
  }

  function render(root, lat, lon, data) {
    var wrap = el('div', 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8');

    data.alerts.slice(0, 3).forEach(function (a) {
      var banner = el('div', 'mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900');
      banner.setAttribute('role', 'alert');
      banner.appendChild(el('p', 'font-bold', a.event));
      if (a.headline) banner.appendChild(el('p', 'text-sm', a.headline));
      wrap.appendChild(banner);
    });

    var cur = data.current;
    var top = el('div', 'flex flex-wrap items-center gap-5 mb-6');
    top.appendChild(el('p', 'sr-only', 'Current conditions'));
    top.appendChild(icon(cur.icon));
    var temp = el('div');
    temp.appendChild(el('p', 'text-5xl font-extrabold text-green-900', cur.temp + '°F'));
    temp.appendChild(el('p', 'text-slate-600', cur.desc));
    top.appendChild(temp);
    var facts = el('ul', 'text-slate-600 md:ml-auto space-y-1');
    if (cur.feelsLike != null && cur.feelsLike !== cur.temp) facts.appendChild(el('li', null, 'Feels like ' + cur.feelsLike + '°F'));
    if (cur.wind) facts.appendChild(el('li', null, 'Wind: ' + cur.wind));
    if (cur.humidity != null) facts.appendChild(el('li', null, 'Humidity: ' + cur.humidity + '%'));
    if (data.precip != null) facts.appendChild(el('li', null, 'Chance of precipitation: ' + data.precip + '%'));
    top.appendChild(facts);
    wrap.appendChild(top);

    var grid = el('div', 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4');
    dayCards(data.daily).forEach(function (c) {
      var card = el('div', 'rounded-xl bg-green-50 border border-green-100 p-4 text-center');
      card.appendChild(el('p', 'font-semibold text-green-900', c.period.name));
      var hi = c.period.temperature + '°';
      card.appendChild(el('p', 'text-2xl font-bold text-green-800', c.low != null ? hi + ' / ' + c.low + '°' : hi));
      card.appendChild(el('p', 'text-sm text-slate-600', c.period.shortForecast));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    var credit = el('p', 'mt-5 text-xs text-slate-500');
    credit.appendChild(document.createTextNode('Data from the '));
    var link = el('a', 'underline hover:text-green-700', 'National Weather Service');
    link.href = 'https://forecast.weather.gov/MapClick.php?lat=' + lat + '&lon=' + lon;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    credit.appendChild(link);
    var asOf = new Date(cur.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    credit.appendChild(document.createTextNode('. ' + (cur.station ? 'Observed at ' + cur.station + ' as of ' : 'Forecast for ') + asOf + '.'));
    wrap.appendChild(credit);

    root.replaceChildren(wrap);
  }

  function renderError(root, city, lat, lon) {
    var box = el('div', 'bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-600');
    box.appendChild(document.createTextNode('Live weather is unavailable right now. '));
    var link = el('a', 'text-green-700 font-semibold hover:underline', 'View the ' + city + ' forecast at weather.gov');
    link.href = 'https://forecast.weather.gov/MapClick.php?lat=' + lat + '&lon=' + lon;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    box.appendChild(link);
    root.replaceChildren(box);
  }

  document.querySelectorAll('[data-nws-weather]').forEach(function (root) {
    var lat = root.getAttribute('data-lat');
    var lon = root.getAttribute('data-lon');
    var city = root.getAttribute('data-city') || 'your area';
    root.appendChild(el('p', 'text-center text-slate-500', 'Loading ' + city + ' weather…'));
    load(lat, lon)
      .then(function (data) { render(root, lat, lon, data); })
      .catch(function () { renderError(root, city, lat, lon); });
  });
})();
