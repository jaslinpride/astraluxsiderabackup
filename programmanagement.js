/* AstraLux Sidera I · Program Management dashboard behaviour */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;

  /* ---------- light / dark mode (light is the default, shared with the home page) ---------- */
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

  /* ---------- live embeds, scaled down to fit each tile ---------- */
  var frames = [].slice.call(document.querySelectorAll('.frame'));
  function fitFrames() {
    frames.forEach(function (f) {
      var fr = f.querySelector('iframe'), w = f.clientWidth, h = f.clientHeight;
      if (!w || !h) return;
      var base = +f.dataset.base || 1150, s = Math.max(0.38, Math.min(1, w / base));
      fr.style.width = (w / s) + 'px'; fr.style.height = (h / s) + 'px'; fr.style.transform = 'scale(' + s + ')';
    });
  }
  frames.forEach(function (f) {
    var fr = f.querySelector('iframe'), ld = f.querySelector('.ld');
    fr.addEventListener('load', function () { if (fr.src && ld) ld.style.display = 'none'; });
    fr.src = fr.dataset.src;
  });
  fitFrames();

  /* ---------- full-screen tool overlay ---------- */
  var ov = $('ov'), of = $('of'), last = null;
  function openTool(url, title) { last = document.activeElement; of.src = url; $('ot').textContent = title; $('ol').href = url; ov.classList.add('open'); $('ox').focus(); }
  function closeTool() { ov.classList.remove('open'); of.src = 'about:blank'; if (last) last.focus(); }
  $('ox').addEventListener('click', closeTool);

  /* =====================================================================
     Document viewer
     PDFs are rendered with PDF.js so they can be searched. If a PDF cannot be
     loaded, the page images (JPEG) are shown instead (no search).
     ===================================================================== */
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/';
  function pages(pre, n, ext) { var a = []; for (var i = 1; i <= n; i++) a.push(pre + i + (ext || '.jpeg')); return a; }
  var DOCS = {
    sow:  { title: 'Statement of Work', pdf: ['Space System Statement of Work.pdf'], img: [pages('Space System Statement of Work.', 8)] },
    wbs:  { title: 'Work Breakdown Structure', pdf: ['Work Breakdown Structure-rev0.pdf'], img: [pages('Work Breakdown Structure-rev0.', 12)] },
    ims:  { title: 'Integrated Master Schedule', pdf: ['Sidera Integrated Master Schedule-rev0.pdf', 'ims.pdf'], img: [pages('Sidera Integrated Master Schedule-rev0.', 17)] },
    semp: { title: 'Systems Engineering Management Plan', pdf: ['Sidera Systems Engineering Management Plan-rev0.pdf'], img: [pages('Sidera Systems Engineering Management Plan-rev0.', 10)] },
    risk: { title: 'Risk and Opportunity Assessment', pdf: ['Sidera Risk Assessment-rev0.pdf', 'ro.pdf'], img: [pages('Sidera Risk Assessment-rev0.', 26), ['ro-1.jpg', 'ro-2.jpg']] },
    evm:  { title: 'Earned Value Management Plan', pdf: ['Sidera Earned Value Management Plan-rev0.pdf', 'Sidera Earned Value Managemenr Plan-rev0.pdf'], img: [pages('Sidera Earned Value Management Plan-rev0.', 8)] }
  };

  var dv = $('dv'), dim = $('dim'), dvb = $('dvb'), q = $('q');
  var cur = null;          // { key, pdf, pages:[{w,h,el,items,rendered}], imgs }
  var zoom = 1, hits = [], hi = -1, state = 'max', prevState = 'max', token = 0, lastFocus = null;
  var pdfjsP = null;
  function pdfjs() {
    if (!pdfjsP) pdfjsP = import(PDFJS + 'pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; return m; });
    return pdfjsP;
  }
  function tryPdf(lib, urls, i) {
    if (i >= urls.length) return Promise.reject(new Error('no pdf'));
    return lib.getDocument({ url: encodeURI(urls[i]) }).promise
      .then(function (d) { return { doc: d, url: urls[i] }; })
      .catch(function () { return tryPdf(lib, urls, i + 1); });
  }
  function probe(src) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = encodeURI(src); }); }

  function setState(s) {
    if (s === 'mini' && state !== 'mini') prevState = state;
    state = s;
    dv.classList.toggle('max', s === 'max');
    dv.classList.toggle('mini', s === 'mini');
    dim.classList.toggle('on', s === 'max');
    dv.setAttribute('aria-modal', s === 'max' ? 'true' : 'false');
    dv.querySelector('[data-w="max"]').textContent = s === 'max' ? '❐' : '▢';
    dv.querySelector('[data-w="max"]').title = s === 'max' ? 'Restore to a window' : 'Full screen';
    dv.querySelector('[data-w="min"]').title = s === 'max' ? 'Shrink to a window' : 'Minimise';
    if (s !== 'mini') requestAnimationFrame(relayout);
  }
  function placeWindow() {        // a smaller window in the lower right, out of the way
    var W = innerWidth, H = innerHeight, w = Math.min(560, W - 24), h = Math.min(Math.round(H * 0.62), H - 24);
    dv.style.width = w + 'px'; dv.style.height = h + 'px';
    dv.style.left = (W - w - 16) + 'px'; dv.style.top = (H - h - 16) + 'px';
  }

  function openDoc(key) {
    var d = DOCS[key]; if (!d) return;
    lastFocus = document.activeElement;
    var my = ++token;
    $('dvt').textContent = d.title; $('dvp').textContent = ''; $('dl').href = encodeURI(d.pdf[0]);
    dvb.innerHTML = '<p class="note">Loading document…</p>';
    q.value = ''; clearHits(); zoom = 1; $('zl').textContent = '100%';
    cur = { key: key, pdf: null, pages: [] };
    dv.classList.add('open'); setState('max');
    setTimeout(function () { q.focus(); }, 30);
    pdfjs().then(function (lib) { cur.lib = lib; return tryPdf(lib, d.pdf, 0); })
      .then(function (r) {
        if (my !== token) return;
        cur.pdf = r.doc; $('dl').href = encodeURI(r.url);
        var jobs = [];
        for (var i = 1; i <= r.doc.numPages; i++) jobs.push(r.doc.getPage(i));
        return Promise.all(jobs).then(function (ps) {
          if (my !== token) return;
          dvb.innerHTML = '';
          ps.forEach(function (p, i) {
            var vp = p.getViewport({ scale: 1 });
            var el = document.createElement('div'); el.className = 'pgw'; el.dataset.i = i;
            el.innerHTML = '<span class="pn">' + (i + 1) + '</span>';
            dvb.appendChild(el);
            cur.pages.push({ p: p, w: vp.width, h: vp.height, el: el, items: null, done: 0 });
          });
          q.disabled = false; q.placeholder = 'Search this document';
          relayout(); updatePage();
          ps.forEach(function (p, i) { p.getTextContent().then(function (tc) { cur.pages[i] && (cur.pages[i].items = tc.items); if (q.value) search(); }); });
        });
      })
      .catch(function () { if (my === token) showImages(d, my); });
  }

  function showImages(d, my) {
    var lists = d.img.slice();
    (function next() {
      var list = lists.shift();
      if (!list) { dvb.innerHTML = '<p class="note">This document has not been uploaded yet.</p>'; return; }
      probe(list[0]).then(function (im) {
        if (my !== token) return;
        dvb.innerHTML = '<p class="note">Showing page images. Search needs the PDF, which could not be loaded.</p>';
        q.disabled = true; q.placeholder = 'Search needs the PDF';
        var ratio = im.naturalHeight / im.naturalWidth || 1.294;
        list.forEach(function (src, i) {
          var el = document.createElement('div'); el.className = 'pgw'; el.dataset.i = i;
          el.innerHTML = '<img loading="lazy" alt="Page ' + (i + 1) + '" src="' + encodeURI(src) + '"><span class="pn">' + (i + 1) + '</span>';
          dvb.appendChild(el);
          cur.pages.push({ w: 612, h: 612 * ratio, el: el, img: true });
        });
        relayout(); updatePage();
      }).catch(next);
    })();
  }

  /* layout and lazy rendering */
  var io = null;
  function scaleFor(pg) { var avail = Math.max(200, dvb.clientWidth - 30); return (avail / pg.w) * zoom; }
  function relayout() {
    if (!cur || !cur.pages.length || state === 'mini') return;
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) render(cur.pages[+e.target.dataset.i]); }); }, { root: dvb, rootMargin: '600px 0px' });
    cur.pages.forEach(function (pg) {
      var s = scaleFor(pg);
      pg.el.style.width = Math.round(pg.w * s) + 'px'; pg.el.style.height = Math.round(pg.h * s) + 'px';
      if (!pg.img) { pg.scale = s; pg.done = 0; io.observe(pg.el); }
    });
  }
  function render(pg) {
    if (!pg || pg.img || pg.done === pg.scale || pg.busy) return;
    var s = pg.scale; pg.busy = true;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var vp = pg.p.getViewport({ scale: s * dpr });
    var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    pg.p.render({ canvasContext: c.getContext('2d'), canvas: c, viewport: vp }).promise.then(function () {
      pg.busy = false;
      var old = pg.el.querySelector('canvas'); if (old) old.remove();
      pg.el.insertBefore(c, pg.el.firstChild); pg.done = s;
      if (pg.scale !== s) render(pg); else drawHits(pg);
    }).catch(function () { pg.busy = false; });
  }

  /* search */
  function clearHits() { hits = []; hi = -1; $('hits').textContent = ''; $('hp').disabled = $('hn').disabled = true; dvb.querySelectorAll('.hl').forEach(function (h) { h.remove(); }); }
  function search() {
    var term = q.value.trim().toLowerCase();
    clearHits();
    if (!cur || !term) return;
    cur.pages.forEach(function (pg, pi) {
      (pg.items || []).forEach(function (it) {
        var s = (it.str || '').toLowerCase(), k = s.indexOf(term);
        while (k > -1) { hits.push({ pg: pi, it: it, a: k, n: term.length }); k = s.indexOf(term, k + term.length); }
      });
    });
    $('hits').textContent = hits.length ? '' : 'No matches';
    $('hp').disabled = $('hn').disabled = !hits.length;
    cur.pages.forEach(drawHits);
    if (hits.length) go(0);
  }
  function box(pg, h) {
    var s = pg.scale, t = h.it.transform;              // PDF space → viewer space (y flipped)
    var fh = Math.hypot(t[2], t[3]) * s || 10 * s;
    var x = t[4] * s, y = (pg.h - t[5]) * s - fh;
    var w = (h.it.width || 0) * s, len = (h.it.str || '').length || 1;
    return { l: x + w * h.a / len, t: y - fh * 0.12, w: Math.max(4, w * h.n / len), h: fh * 1.25 };
  }
  function drawHits(pg) {
    if (!pg || pg.img) return;
    pg.el.querySelectorAll('.hl').forEach(function (h) { h.remove(); });
    hits.forEach(function (h, i) {
      if (cur.pages[h.pg] !== pg) return;
      var b = box(pg, h), d = document.createElement('i');
      d.className = 'hl' + (i === hi ? ' on' : ''); d.dataset.h = i;
      d.style.cssText = 'left:' + b.l + 'px;top:' + b.t + 'px;width:' + b.w + 'px;height:' + b.h + 'px';
      pg.el.appendChild(d);
    });
  }
  function go(i) {
    if (!hits.length) return;
    hi = (i + hits.length) % hits.length;
    $('hits').textContent = (hi + 1) + ' of ' + hits.length;
    dvb.querySelectorAll('.hl.on').forEach(function (h) { h.classList.remove('on'); });
    var mark = dvb.querySelector('.hl[data-h="' + hi + '"]'); if (mark) mark.classList.add('on');
    var h = hits[hi], pg = cur.pages[h.pg], b = box(pg, h);
    dvb.scrollTo({ top: pg.el.offsetTop - dvb.offsetTop + b.t - dvb.clientHeight / 3, left: Math.max(0, pg.el.offsetLeft + b.l - dvb.clientWidth / 2), behavior: 'smooth' });
  }
  var st; q.addEventListener('input', function () { clearTimeout(st); st = setTimeout(search, 180); });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!hits.length) search(); else go(hi + (e.shiftKey ? -1 : 1)); } });
  $('hn').addEventListener('click', function () { go(hi + 1); });
  $('hp').addEventListener('click', function () { go(hi - 1); });

  /* zoom + page indicator */
  dv.querySelectorAll('[data-z]').forEach(function (b) {
    b.addEventListener('click', function () {
      zoom = Math.max(0.5, Math.min(3, Math.round((zoom + (+b.dataset.z) * 0.25) * 100) / 100));
      $('zl').textContent = Math.round(zoom * 100) + '%'; relayout();
    });
  });
  function updatePage() {
    if (!cur || !cur.pages.length) return;
    var mid = dvb.scrollTop + dvb.clientHeight / 2, n = 1;
    cur.pages.forEach(function (pg, i) { if (pg.el.offsetTop - dvb.offsetTop <= mid) n = i + 1; });
    $('dvp').textContent = 'Page ' + n + ' / ' + cur.pages.length;
  }
  dvb.addEventListener('scroll', function () { requestAnimationFrame(updatePage); });

  function closeDoc() {
    token++; dv.classList.remove('open', 'mini', 'max'); dim.classList.remove('on');
    if (io) io.disconnect(); dvb.innerHTML = '';
    if (cur && cur.pdf) { try { (cur.pdf.destroy || cur.pdf.cleanup).call(cur.pdf); } catch (e) {} }
    cur = null; state = 'max';
    if (lastFocus) lastFocus.focus();
  }

  /* window buttons */
  dv.querySelector('[data-w="close"]').addEventListener('click', closeDoc);
  dv.querySelector('[data-w="min"]').addEventListener('click', function () {
    if (state === 'max') { placeWindow(); setState('win'); } else setState('mini');
  });
  dv.querySelector('[data-w="max"]').addEventListener('click', function () {
    if (state === 'max') { placeWindow(); setState('win'); } else setState('max');
  });
  dim.addEventListener('click', function () { placeWindow(); setState('win'); });   // click the dimmed page to move the document out of the way

  /* drag the window by its title bar; tap the minimised pill to restore */
  function clampPos(l, t) {
    var r = dv.getBoundingClientRect();
    return { l: Math.max(Math.min(0, 170 - r.width), Math.min(Math.max(0, innerWidth - r.width), l)), t: Math.max(0, Math.min(innerHeight - 44, t)) };   // title-bar buttons always stay on screen
  }
  $('dvh').addEventListener('pointerdown', function (e) {
    if (e.target.closest('button') || e.button > 0) return;
    if (state === 'mini') { setState(prevState === 'max' ? 'max' : 'win'); return; }
    var r = dv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
    var moved = false, sx = e.clientX, sy = e.clientY, ox = e.clientX - r.left, oy = e.clientY - r.top;
    var hdr = this; hdr.setPointerCapture(e.pointerId);
    function mv(ev) {
      if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return;
      if (!moved && state === 'max') {      // pulling a full-screen document turns it into a window under the pointer
        var w = Math.min(Math.round(innerWidth * 0.55), innerWidth - 24), h = Math.min(Math.round(innerHeight * 0.7), innerHeight - 24);
        dv.style.width = w + 'px'; dv.style.height = h + 'px'; ox = fx * w; oy = 18; setState('win');
      }
      moved = true;
      var p = clampPos(ev.clientX - ox, ev.clientY - oy); dv.style.left = p.l + 'px'; dv.style.top = p.t + 'px';
    }
    function up() { hdr.removeEventListener('pointermove', mv); hdr.removeEventListener('pointerup', up); hdr.removeEventListener('pointercancel', up); }
    hdr.addEventListener('pointermove', mv); hdr.addEventListener('pointerup', up); hdr.addEventListener('pointercancel', up);
  });
  $('dvh').addEventListener('dblclick', function (e) { if (!e.target.closest('button') && state !== 'mini') { if (state === 'max') { placeWindow(); setState('win'); } else setState('max'); } });

  /* resize from the lower-right corner */
  $('rz').addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var r = dv.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, el = this, rt;
    el.setPointerCapture(e.pointerId);
    function mv(ev) {
      dv.style.width = Math.max(300, Math.min(innerWidth - r.left - 4, r.width + ev.clientX - sx)) + 'px';
      dv.style.height = Math.max(200, Math.min(innerHeight - r.top - 4, r.height + ev.clientY - sy)) + 'px';
      clearTimeout(rt); rt = setTimeout(relayout, 120);
    }
    function up() { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); relayout(); }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });

  /* ---------- tile buttons ---------- */
  $('grid').addEventListener('click', function (e) {
    var d = e.target.closest('[data-doc]'); if (d) { openDoc(d.dataset.doc); return; }
    var t = e.target.closest('[data-embed]'); if (t) openTool(t.dataset.embed, t.dataset.title);
  });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (ov.classList.contains('open')) closeTool();
      else if (dv.classList.contains('open')) closeDoc();
      else menu(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && dv.classList.contains('open') && state !== 'mini' && !q.disabled) {
      e.preventDefault(); q.focus(); q.select();
    }
  });

  var rt; window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      fitFrames();
      if (dv.classList.contains('open') && state === 'win') { var p = clampPos(parseFloat(dv.style.left) || 0, parseFloat(dv.style.top) || 0); dv.style.left = p.l + 'px'; dv.style.top = p.t + 'px'; }
      relayout();
    }, 120);
  });
})();
