/* AstraLux Sidera I · Home dashboard behaviour */
(function () {
  'use strict';
  var TODAY = new Date('2026-11-20T12:00:00Z');   // program status date
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;

  /* ---------- light / dark mode (light is the default) ---------- */
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('astralux-theme', t); } catch (e) {}
    $('mode').querySelector('.mode-lb').textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    $('mode').setAttribute('aria-pressed', t === 'dark');
  }
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  $('mode').addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  /* ---------- mobile menu ---------- */
  var side = $('side'), scrim = $('scrim');
  var img = document.querySelector('.menu img');
  if (img) img.addEventListener('error', function () { img.setAttribute('data-broken', ''); });
  function menu(open) {
    side.classList.toggle('open', open); scrim.classList.toggle('on', open);
    if (img && !img.hasAttribute('data-broken')) img.src = open ? 'close.png' : 'hamburger.png';
  }
  $('menu').addEventListener('click', function () { menu(!side.classList.contains('open')); });
  scrim.addEventListener('click', function () { menu(false); });

  /* ---------- clock ---------- */
  (function tick() {
    $('clk').textContent = '🕘 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' local';
    setTimeout(tick, 30000);
  })();

  /* ---------- hero: timeline and milestone countdown ---------- */
  var days = function (d) { return Math.round((new Date(d + 'T12:00:00Z') - TODAY) / 864e5); };
  $('cdn').textContent = days('2026-11-30');
  (function () {
    var a = new Date('2025-10-01'), b = new Date('2029-01-25');
    var X = function (d) { return ((new Date(d) - a) / (b - a) * 100).toFixed(2) + '%'; };
    var ms = [['SRR', '2025-12-16'], ['PDR', '2026-06-16'], ['CDR', '2026-11-30'], ['FDR', '2027-06-09'], ['Launch*', '2028-06-01'], ['FOC*', '2029-01-25']];
    $('htl').innerHTML = '<div class="fillbar" style="width:' + X(TODAY) + '"></div>' +
      ms.map(function (m) { return '<i style="left:' + X(m[1]) + '"></i><em style="left:' + X(m[1]) + '">' + m[0] + '</em>'; }).join('') +
      '<i class="now" style="left:' + X(TODAY) + '"></i>';
    var M = [['CDR', '2026-11-30'], ['TRR', '2027-03-10'], ['FDR', '2027-06-09'], ['PRR', '2027-08-19'], ['Launch*', '2028-06-01']];
    $('mcount').innerHTML = M.map(function (m) { return '<div><b>' + days(m[1]) + '</b><span>days · ' + m[0] + '</span></div>'; }).join('');
  })();

  /* ---------- schedule mini-Gantt (sized to its tile) ---------- */
  function gantt() {
    var el = $('gantt'), W = Math.max(200, el.clientWidth || el.getBoundingClientRect().width), H = Math.max(80, el.clientHeight || el.getBoundingClientRect().height);
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var a = new Date('2025-10-01'), b = new Date('2029-03-10'), X = function (d) { return (new Date(d) - a) / (b - a) * W; };
    var rows = [['Requirements & documents', '2025-10-01', '2026-03-17', '#2B3A7A', 1], ['Design (PDR → CDR)', '2026-03-18', '2026-11-27', '#1B8F86', .97],
      ['Qualification build & test', '2026-11-30', '2027-06-08', '#B87914', 0], ['Ground segment', '2026-06-16', '2027-07-16', '#6554C0', .3],
      ['Digital twin (critical)', '2026-05-13', '2027-08-18', '#C8412E', .35], ['Production → launch (TBR)', '2027-08-19', '2028-06-01', '#5A6178', 0],
      ['On-orbit test → FOC', '2028-06-01', '2029-01-25', '#5A6178', 0]];
    var rh = (H - 22) / 7.4, s = '';
    for (var y = 2026; y <= 2029; y++) { var x = X(y + '-01-01'); s += '<line class="g-grid" x1="' + x + '" x2="' + x + '" y1="0" y2="' + (H - 12) + '"/><text class="g-lab" x="' + (x + 3) + '" y="' + (H - 2) + '" font-size="10">' + y + '</text>'; }
    rows.forEach(function (o, i) {
      var y0 = 2 + i * rh, x0 = X(o[1]), x1 = X(o[2]), bh = Math.min(16, rh - 3), w = x1 - x0, inside = w > o[0].length * 6.2 + 8;
      var len = o[0].length * 6, right = x1 + 4 + len > W, leftOk = x0 - 4 - len > 0;
      var tx = inside ? x0 + 5 : !right ? x1 + 4 : leftOk ? x0 - 4 : W - 4, anc = inside || !right ? 'start' : 'end';
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + bh + '" rx="4" fill="' + o[3] + '" opacity=".2"/>' +
        '<rect x="' + x0 + '" y="' + y0 + '" width="' + (w * o[4]) + '" height="' + bh + '" rx="4" fill="' + o[3] + '"/>' +
        '<text x="' + tx + '" y="' + (y0 + bh / 2 + 3.5) + '" font-size="10" font-weight="600" text-anchor="' + anc + '" class="' + (inside && o[4] > .5 ? '' : 'g-text') + '"' + (inside && o[4] > .5 ? ' fill="#fff"' : '') + '>' + o[0] + '</text>';
    });
    var xn = X(TODAY);
    s += '<line class="g-today" x1="' + xn + '" x2="' + xn + '" y1="0" y2="' + (H - 12) + '" stroke-width="2"/><text class="g-todayt" x="' + (xn + 4) + '" y="' + (H - 14) + '" font-size="10" font-weight="700">today</text>';
    [['CDR', '2026-11-30'], ['TRR', '2027-03-10'], ['FDR', '2027-06-09'], ['PRR', '2027-08-19'], ['Launch', '2028-06-01'], ['FOC', '2029-01-25']].forEach(function (m) {
      var x = X(m[1]); s += '<path class="g-ms" d="M' + x + ',' + (H - 24) + ' l4,4 l-4,4 l-4,-4z"><title>' + m[0] + ' ' + m[1] + '</title></path>';
    });
    el.innerHTML = s;
  }

  /* ---------- risk heat map (current ratings, RK-01 to RK-26) ---------- */
  (function () {
    var cnt = { '3,3': 9, '3,4': 6, '2,3': 4, '2,4': 3, '4,4': 2, '4,3': 1 }, s = '';
    var col = function (L, C) { return L * C >= 15 ? '#B3261E' : L * C >= 8 ? '#E8A33D' : '#8FD3CC'; };
    for (var L = 1; L <= 5; L++) for (var C = 1; C <= 5; C++) {
      var n = cnt[L + ',' + C] || 0, x = 10 + (C - 1) * 22, y = (5 - L) * 22;
      s += '<rect x="' + x + '" y="' + y + '" width="21" height="21" rx="3" fill="' + col(L, C) + '"' + (n ? '' : ' class="h-empty"') + '/>';
      if (n) s += '<text x="' + (x + 10.5) + '" y="' + (y + 14.5) + '" font-size="10" font-weight="700" text-anchor="middle" fill="' + (L * C >= 15 ? '#fff' : '#0B1026') + '">' + n + '</text>';
    }
    s += '<text class="g-lab" x="4" y="58" font-size="6" transform="rotate(-90 4 58)" text-anchor="middle">LIKELIHOOD</text><text class="g-lab" x="64" y="118" font-size="6" text-anchor="middle">CONSEQUENCE</text>';
    $('heat').innerHTML = s;
  })();

  /* ---------- test donut (pre-CDR run R1) ---------- */
  (function () {
    var d = [['Passed', 15, '#1F9D5C'], ['Retest', 3, '#E8A33D'], ['Failed', 2, '#B3261E'], ['Blocked', 1, '#5A6178'], ['Untested', 1, '#C9CED8']];
    var t = 22, a = -Math.PI / 2, r = 34, c = 50, s = '';
    d.forEach(function (o) {
      var a1 = a + o[1] / t * Math.PI * 2;
      s += '<path d="M' + (c + r * Math.cos(a)) + ',' + (c + r * Math.sin(a)) + ' A' + r + ',' + r + ' 0 ' + (o[1] / t > .5 ? 1 : 0) + ' 1 ' + (c + r * Math.cos(a1)) + ',' + (c + r * Math.sin(a1)) + '" fill="none" stroke="' + o[2] + '" stroke-width="12"><title>' + o[0] + ': ' + o[1] + '</title></path>';
      a = a1;
    });
    s += '<text class="d-center" x="50" y="50" text-anchor="middle" font-size="16" font-weight="700">68%</text><text class="d-sub" x="50" y="61" text-anchor="middle" font-size="6.5">pre-CDR passed</text>';
    $('donut').innerHTML = s;
  })();

  /* ---------- sprint burndown (sized to its tile) ---------- */
  function burn() {
    var el = $('burn'), W = Math.max(150, el.clientWidth || el.getBoundingClientRect().width), H = Math.max(60, el.clientHeight || el.getBoundingClientRect().height);
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var act = [75, 65, 63, 55, 50, 42, 40, 37], n = 9, x0 = 22, y1 = H - 14;
    var X = function (i) { return x0 + i / n * (W - x0 - 6); }, Y = function (v) { return 8 + (1 - v / 75) * (y1 - 8); }, s = '';
    for (var k = 0; k <= 3; k++) { var v = 75 * k / 3; s += '<line class="g-grid" x1="' + x0 + '" x2="' + (W - 6) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="g-lab" x="' + (x0 - 3) + '" y="' + (Y(v) + 3) + '" font-size="9" text-anchor="end">' + Math.round(v) + '</text>'; }
    s += '<line class="g-guide" x1="' + X(0) + '" y1="' + Y(75) + '" x2="' + X(n) + '" y2="' + Y(0) + '"/>';
    var pts = act.map(function (v, i) { return X(i) + ',' + Y(v); });
    s += '<path class="g-area" d="M' + pts.join(' L') + ' L' + X(act.length - 1) + ',' + y1 + ' L' + X(0) + ',' + y1 + 'z"/><polyline class="g-line" stroke-width="2.4" points="' + pts.join(' ') + '"/>';
    act.forEach(function (v, i) { s += '<circle class="g-dot" cx="' + X(i) + '" cy="' + Y(v) + '" r="2.4"/>'; });
    s += '<text class="g-burnt" x="' + (X(act.length - 1) + 5) + '" y="' + (Y(37) - 5) + '" font-size="10" font-weight="700">37 pts</text><text class="g-lab" x="' + (W - 6) + '" y="' + (H - 2) + '" font-size="9" text-anchor="end">11 → 24 Nov · guideline dashed</text>';
    el.innerHTML = s;
  }

  /* ---------- teams, budgets, meetings ---------- */
  var T = { Polaris: '#2B3A7A', Vega: '#1B8F86', Altair: '#B87914', Rigel: '#6554C0', Deneb: '#C8412E', Sirius: '#2F6FDB' };
  $('teams').innerHTML = Object.keys(T).map(function (k) { return '<span style="background:' + T[k] + '">' + k + '</span>'; }).join('');
  var B = [['Mass', '480 / 600 kg', 480 / 600, '#2B3A7A'], ['Power (orbit avg)', '820 / 1,000 W', .82, '#E8A33D'], ['Delta-v', '110 / 150 m/s', 110 / 150, '#6554C0'], ['Pointing', '0.035 / 0.05°', .7, '#1B8F86'], ['X-band per contact', '384 Gb · 800 Mbps', .9, '#2F6FDB']];
  $('budgets').innerHTML = B.map(function (o) {
    return '<div class="bar"><div class="r"><b>' + o[0] + '</b><span class="mut">' + o[1] + ' · ' + Math.round((1 - o[2]) * 100) + '% margin</span></div><div class="tr"><i style="width:' + (o[2] * 100) + '%;background:' + o[3] + '"></i></div></div>';
  }).join('') + '<p class="mut">RF · Data · ADCS · Propulsion · Thermal · Mass · Power · Cost</p>';
  var M = [['Mon 23', '13:00', 'CDR dry run', '#E8A33D'], ['Tue 24', '14:00', 'All Team Task Sync · sprint 30 review', '#2EC4B6'], ['Wed 25', '10:00', 'Software Team Task Sync', '#1B8F86'], ['Mon 30', '08:30', 'Critical Design Review', '#C8412E'], ['Thu 3 Dec', '11:00', 'Customer Meeting (USSF)', '#5A6178']];
  $('meet').innerHTML = M.map(function (o) { return '<div><span class="dot" style="background:' + o[3] + '"></span><span class="d">' + o[0] + '</span><span class="mut">' + o[1] + '</span> ' + o[2] + '</div>'; }).join('');

  gantt(); burn();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { gantt(); burn(); }, 120); });

  /* ---------- tool overlay ---------- */
  var ov = $('ov'), of = $('of'), last = null;
  function openTool(url, title) { last = document.activeElement; of.src = url; $('ot').textContent = title; $('ol').href = url; ov.classList.add('open'); $('ox').focus(); }
  function closeTool() { ov.classList.remove('open'); of.src = 'about:blank'; if (last) last.focus(); }
  $('grid').addEventListener('click', function (e) { var x = e.target.closest('[data-open]'); if (x) { e.stopPropagation(); openTool(x.dataset.open, x.dataset.title); } });
  $('grid').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var x = e.target.closest('[data-open]'); if (x) { e.preventDefault(); openTool(x.dataset.open, x.dataset.title); } } });
  $('ox').addEventListener('click', closeTool);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (ov.classList.contains('open')) closeTool(); else menu(false); } });
})();
