/*
 * 3D ornament spin: window.OrnamentSpin.spin(img)
 *
 * Turns a flat ornament picture into a rotating solid. The silhouette of the artwork (its transparent edge) gives the
 * outline of a body of revolution, like a bauble turned on a lathe. The artwork is printed onto that body and the body
 * turns once around its vertical axis. A fixed light adds shading, a glass glint and a soft rim, so the picture visibly
 * wraps round the ornament while the light stays put.
 *
 * It works in WebGL and draws into a canvas that temporarily replaces the image, so the layout does not move. At the
 * start and end of the turn the shading is off, so the first and last frames match the original picture.
 *
 * spin() returns false when it cannot run (no WebGL, image not loaded, squeezed by the layout). The caller can then use
 * its own fallback. With reduced motion it does nothing and returns true.
 */
(function (global) {
  'use strict';

  var DURATION = 2000;     // milliseconds for one full turn
  var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);',   // u runs left to right, v runs top to bottom like the image
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',     // the artwork
    'uniform sampler2D uProf;',    // radius of the body at each image row, packed into two 8-bit channels
    'uniform float uTheta;',       // turn angle in radians
    'uniform float uLight;',       // 0 = flat artwork, 1 = full shading
    'uniform float uCx;',          // centre column of the artwork, 0..1
    'uniform float uAspect;',      // image height divided by width
    'uniform float uAA;',          // one output pixel in image-width units
    'uniform float uRows;',        // number of image rows
    '',
    'float radiusAt(float v) {',
    '  vec4 t = texture2D(uProf, vec2(clamp(v, 0.0, 1.0), 0.5));',
    '  return (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0 * 0.5;',
    '}',
    '',
    'void main() {',
    '  float v = vUv.y;',
    '  float r = radiusAt(v);',
    '  float x = vUv.x - uCx;',
    '  if (r <= 0.0005 || abs(x) > r + uAA) discard;',
    '  float edge = 1.0 - smoothstep(r - uAA, r + uAA, abs(x));',
    '  float xc = clamp(x, -r, r);',
    '  float z = sqrt(max(r * r - xc * xc, 0.0));',            // depth of the surface point facing the viewer
    '',
    // Longitude of this surface point in the ornament\'s own frame. The artwork covers the front half and is mirrored onto
    // the back half. At rest the artwork is projected straight on, so it matches the flat picture exactly. While it turns,
    // the mapping eases to an even wrap round the body, which stops the artwork\'s outer rim being stretched across the
    // middle when the ornament is side-on.
    '  float lon = asin(clamp(xc / max(r, 0.0001), -1.0, 1.0)) - uTheta;',
    '  lon = mod(lon + 3.14159265, 6.2831853) - 3.14159265;',
    '  if (abs(lon) > 1.5707963) lon = sign(lon) * (3.14159265 - abs(lon));',
    '  float xo = r * mix(sin(lon), lon * 0.63661977, uLight);',
    '  vec4 art = texture2D(uTex, vec2(uCx + xo, v));',

    '',
    // Surface normal of a body of revolution: radial part from the position, vertical part from how fast the radius changes.
    '  float dv = 6.0 / uRows;',
    '  float drdv = (radiusAt(v + dv) - radiusAt(v - dv)) / (2.0 * dv);',
    '  vec3 n = normalize(vec3(xc / max(r, 0.001), drdv / uAspect, z / max(r, 0.001)));',
    '',
    '  vec3 L = normalize(vec3(-0.45, 0.62, 0.64));',
    '  float shade = mix(1.0, 0.76 + 0.36 * dot(n, L), uLight);',
    '  vec3 col = art.rgb * shade;',
    '  vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  float spec = pow(max(dot(n, h), 0.0), 70.0);',
    '  float rim = pow(1.0 - max(n.z, 0.0), 2.5);',
    '  col += vec3(1.0, 0.98, 0.92) * spec * 0.7 * uLight;',
    '  col += vec3(0.62, 0.78, 1.0) * rim * 0.22 * uLight;',
    '  col = clamp(col, 0.0, 1.0);',
    '',
    '  float a = art.a * edge;',
    '  gl_FragColor = vec4(col * a, a);',                       // premultiplied alpha
    '}'
  ].join('\n');

  var glCanvas = null;
  var gl = null;
  var program = null;
  var uniforms = {};
  var failed = false;
  var cache = {};       // image address -> prepared textures and outline
  var active = [];      // spins in progress
  var looping = false;

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function ensureGL() {
    if (failed) return false;
    if (gl && !gl.isContextLost()) return true;
    try {
      gl = null;
      cache = {};
      glCanvas = document.createElement('canvas');
      var opts = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false };
      gl = glCanvas.getContext('webgl', opts) || glCanvas.getContext('experimental-webgl', opts);
      if (!gl) throw new Error('WebGL is not available');
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      ['uTex', 'uProf', 'uTheta', 'uLight', 'uCx', 'uAspect', 'uAA', 'uRows'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
      });
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var position = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1i(uniforms.uProf, 1);
      gl.disable(gl.BLEND);
      return true;
    } catch (error) {
      failed = true;
      gl = null;
      if (global.console) global.console.warn('3D ornament spin unavailable:', error);
      return false;
    }
  }

  function makeTexture(unit, filter) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return texture;
  }

  // Work out the body's outline from the artwork's transparent edge and upload both textures.
  function prepare(img) {
    var key = img.currentSrc || img.src;
    if (cache[key]) return cache[key];
    var w = img.naturalWidth;
    var h = img.naturalHeight;
    if (!w || !h) return null;

    var scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    var g = scratch.getContext('2d');
    g.drawImage(img, 0, 0);
    var data;
    try { data = g.getImageData(0, 0, w, h).data; } catch (error) { return null; }   // blocked for cross-origin pictures

    var left = new Array(h);
    var right = new Array(h);
    var minX = w;
    var maxX = -1;
    for (var y = 0; y < h; y++) {
      var lo = -1;
      var hi = -1;
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 40) { if (lo < 0) lo = x; hi = x; }
      }
      left[y] = lo;
      right[y] = hi;
      if (lo >= 0) { minX = Math.min(minX, lo); maxX = Math.max(maxX, hi); }
    }
    if (maxX < 0) return null;
    var cx = (minX + maxX + 1) / 2;

    var radius = new Array(h);
    for (var row = 0; row < h; row++) {
      radius[row] = left[row] < 0 ? 0 : Math.max(cx - left[row], right[row] + 1 - cx) / w;
    }
    // Smooth the outline so the surface normals do not jitter from pixel to pixel.
    for (var pass = 0; pass < 6; pass++) {
      var next = radius.slice();
      for (var i = 2; i < h - 2; i++) {
        if (radius[i] === 0) continue;
        next[i] = (radius[i - 2] + radius[i - 1] + radius[i] + radius[i + 1] + radius[i + 2]) / 5;
      }
      radius = next;
    }

    var packed = new Uint8Array(h * 4);
    for (var j = 0; j < h; j++) {
      var q = Math.round(Math.min(radius[j] * 2, 1) * 65535);
      packed[j * 4] = q >> 8;
      packed[j * 4 + 1] = q & 255;
      packed[j * 4 + 3] = 255;
    }

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    var art = makeTexture(0, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    var prof = makeTexture(1, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, h, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, packed);

    var entry = { art: art, prof: prof, cx: cx / w, aspect: h / w, rows: h };
    cache[key] = entry;
    return entry;
  }

  function smoothstep(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function renderFrame(item, theta, light) {
    if (glCanvas.width !== item.cw || glCanvas.height !== item.ch) {
      glCanvas.width = item.cw;
      glCanvas.height = item.ch;
    }
    gl.viewport(0, 0, item.cw, item.ch);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, item.entry.art);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, item.entry.prof);
    gl.uniform1f(uniforms.uTheta, theta);
    gl.uniform1f(uniforms.uLight, light);
    gl.uniform1f(uniforms.uCx, item.entry.cx);
    gl.uniform1f(uniforms.uAspect, item.entry.aspect);
    gl.uniform1f(uniforms.uAA, 1 / item.cw);
    gl.uniform1f(uniforms.uRows, item.entry.rows);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    item.ctx.clearRect(0, 0, item.cw, item.ch);
    item.ctx.drawImage(glCanvas, 0, 0);
  }

  function finish(item) {
    if (item.canvas.parentNode) item.canvas.parentNode.removeChild(item.canvas);
    item.img.style.display = item.previousDisplay;
    item.img.__orn3dBusy = false;
  }

  function loop(now) {
    for (var i = active.length - 1; i >= 0; i--) {
      var item = active[i];
      if (!item.img.isConnected || gl.isContextLost()) {   // the page re-rendered the picture, or the GPU reset
        finish(item);
        active.splice(i, 1);
        continue;
      }
      if (!item.start) item.start = now;
      var t = (now - item.start) / DURATION;
      if (t >= 1) {
        finish(item);
        active.splice(i, 1);
        continue;
      }
      var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var light = smoothstep(0, 0.12, t) * (1 - smoothstep(0.88, 1, t));
      renderFrame(item, eased * Math.PI * 2, light);
    }
    if (active.length) global.requestAnimationFrame(loop); else looping = false;
  }

  function begin(img) {
    if (!img || !img.isConnected || !img.complete || !img.naturalWidth) return null;
    var width = img.clientWidth;
    var height = img.clientHeight;
    if (!width || !height) return null;
    if (!ensureGL()) return null;
    var entry = prepare(img);
    if (!entry) return null;
    if (Math.abs(height / width - entry.aspect) > 0.04 * entry.aspect) return null;   // layout squeezed the picture

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // The canvas takes the picture's place and box so nothing around it moves.
    var style = global.getComputedStyle(img);
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'width:' + width + 'px;height:' + height + 'px;display:' + style.display +
      ';margin:' + style.margin + ';flex-shrink:' + style.flexShrink + ';vertical-align:' + style.verticalAlign +
      ';filter:' + style.filter + ';max-width:none;pointer-events:none';
    var item = {
      img: img, canvas: canvas, ctx: ctx, entry: entry, cw: canvas.width, ch: canvas.height,
      previousDisplay: img.style.display, start: 0
    };
    img.parentNode.insertBefore(canvas, img);
    img.style.display = 'none';
    img.__orn3dBusy = true;
    return item;
  }

  function spin(img) {
    if (reduced) return true;
    if (img && img.__orn3dBusy) return true;
    var item = begin(img);
    if (!item) return false;
    active.push(item);
    if (!looping) { looping = true; global.requestAnimationFrame(loop); }
    return true;
  }

  // Test hook: draw one still frame at an angle in degrees and return a function that puts the picture back.
  function still(img, degrees, light) {
    var item = begin(img);
    if (!item) return null;
    renderFrame(item, degrees * Math.PI / 180, light === undefined ? 1 : light);
    return function () { finish(item); };
  }

  global.OrnamentSpin = { spin: spin, _still: still };
})(window);
