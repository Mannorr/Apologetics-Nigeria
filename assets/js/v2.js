/* Apologetics Nigeria — v2 interactions. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ─── scroll-frame scheduler: one rAF per scroll for everything ─── */
  var onScrollFns = [];
  var ticking = false;
  function runScroll() { ticking = false; var y = window.scrollY; onScrollFns.forEach(function (f) { f(y); }); }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(runScroll); });

  /* ─── 1. Lagos clock ─── */
  var clocks = $$('[data-clock]');
  function tickClock() {
    var t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
    clocks.forEach(function (c) { c.textContent = t; });
  }
  if (clocks.length) { tickClock(); setInterval(tickClock, 15000); }

  /* ─── 2. Nav: theme follows the section beneath it; hides on scroll down ─── */
  var bar = $('#bar');
  var themed = $$('[data-theme]').filter(function (el) { return el !== bar; });
  var lastY = 0;
  onScrollFns.push(function (y) {
    if (!bar) return;
    var probe = bar.offsetHeight / 2;
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { bar.setAttribute('data-theme', themed[i].getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); break; }
    }
    if (!document.body.classList.contains('menu-open')) {
      var hide = y > lastY && y > 300;
      bar.classList.toggle('is-hidden', hide); document.body.classList.toggle('bar-hidden', hide);
    }
    lastY = y;
  });

  /* ─── 3. Menu overlay with focus trap ─── */
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  if (menu && menuBtn) {
    var label = $('.bar-menu-label', menuBtn);
    var prevTheme = 'dark';
    var openMenu = function () {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      menuBtn.setAttribute('aria-expanded', 'true'); label.textContent = 'Close';
      document.body.classList.add('menu-open');
      prevTheme = bar.getAttribute('data-theme'); bar.setAttribute('data-theme', 'dark'); bar.classList.remove('is-hidden');
      setTimeout(function () { var f = $('.menu-inner', menu); if (f) f.focus({ preventScroll: true }); }, 300);
    };
    var closeMenu = function (returnFocus) {
      menu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false'); label.textContent = 'Menu';
      document.body.classList.remove('menu-open');
      bar.setAttribute('data-theme', prevTheme);
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 800);
      if (returnFocus) menuBtn.focus();
    };
    menuBtn.addEventListener('click', function () { menu.classList.contains('is-open') ? closeMenu(false) : openMenu(); });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key === 'Tab') {
        var f = [menuBtn].concat($$('a', menu));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
  }

  /* ─── 4. Hero: the question field and the lamp ─── */
  var field = $('#qfield');
  if (field) {
    var base = $('.qfield-base', field), lit = $('.qfield-lit', field);
    var originals = $$('a', base);
    var fill = function () {
      $$('.is-clone', base).forEach(function (n) { if (n.nextSibling && n.nextSibling.nodeType === 3) n.nextSibling.remove(); n.remove(); });
      // keep appending shuffled passes until the field overflows
      var guard = 0, pass = 1;
      while (base.scrollHeight <= base.clientHeight + 60 && guard++ < 14) {
        var order = originals.slice().sort(function (a, b) { return ((a.textContent.length * 7 + pass * 13) % 11) - ((b.textContent.length * 5 + pass * 3) % 11); });
        order.forEach(function (a) {
          var c = a.cloneNode(true); c.classList.add('is-clone'); c.setAttribute('tabindex', '-1'); c.setAttribute('aria-hidden', 'true');
          base.appendChild(c); base.appendChild(document.createTextNode(' '));
        });
        pass++;
      }
      lit.innerHTML = base.innerHTML;
      var b = $$('a', base), l = $$('a', lit);
      b.forEach(function (a, k) { a.dataset.k = k; });
      l.forEach(function (a) { a.removeAttribute('href'); a.removeAttribute('tabindex'); });
      field._lit = l;
    };
    fill();
    var fillT; window.addEventListener('resize', function () { clearTimeout(fillT); fillT = setTimeout(fill, 200); });

    base.addEventListener('pointerover', function (e) {
      var a = e.target.closest('a'); if (!a || !field._lit) return;
      field._lit.forEach(function (x) { x.classList.remove('hot'); });
      var m = field._lit[+a.dataset.k]; if (m) m.classList.add('hot');
    });
    base.addEventListener('pointerout', function (e) {
      if (e.target.closest('a') && field._lit) field._lit.forEach(function (x) { x.classList.remove('hot'); });
    });
    base.addEventListener('focusin', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      var r = a.getBoundingClientRect(), fr = field.getBoundingClientRect();
      target.x = r.left + r.width / 2 - fr.left; target.y = r.top + r.height / 2 - fr.top; manual = true;
    });

    var hero = field.parentElement;
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, manual = false, idleT, t0 = performance.now();
    var setR = function () { hero.style.setProperty('--r', clamp(hero.clientWidth * 0.2, 170, 340) + 'px'); };
    setR(); window.addEventListener('resize', setR);
    cur.x = target.x = hero.clientWidth * 0.68; cur.y = target.y = hero.clientHeight * 0.38;

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      target.x = e.clientX - r.left; target.y = e.clientY - r.top; manual = true;
      clearTimeout(idleT); idleT = setTimeout(function () { manual = false; }, 4000);
    });
    var visible = true;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    var frame = function (now) {
      if (visible) {
        if (!manual && !reduce) { // slow lissajous drift when nobody is steering
          var t = (now - t0) / 1000, w = hero.clientWidth, h = hero.clientHeight;
          target.x = w * (0.5 + 0.34 * Math.sin(t * 0.21)); target.y = h * (0.42 + 0.24 * Math.sin(t * 0.33 + 1.2));
        }
        cur.x = lerp(cur.x, target.x, reduce ? 1 : 0.085); cur.y = lerp(cur.y, target.y, reduce ? 1 : 0.085);
        var fr = lit.getBoundingClientRect(), hr = hero.getBoundingClientRect();
        lit.style.setProperty('--lx', (cur.x - (fr.left - hr.left)) + 'px');
        lit.style.setProperty('--ly', (cur.y - (fr.top - hr.top)) + 'px');
        hero.style.setProperty('--mx', cur.x + 'px'); hero.style.setProperty('--my', cur.y + 'px');
      }
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  if (!finePointer) { var hint = $('.hero-hint'); if (hint) hint.lastChild.textContent = 'Tap a question · every one opens an answer'; }

  /* ─── 5. Entrance ─── */
  var go = function () { root.classList.add('loaded'); };
  if (document.fonts && document.fonts.ready) { Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(go); }); }
  else window.addEventListener('load', go);

  /* ─── 6. Reveal on enter (rect check: IO ignores fully clipped targets) ─── */
  var rv = $$('.reveal');
  onScrollFns.push(function () {
    var vh = window.innerHeight;
    rv = rv.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.88 && r.bottom > 0) { el.classList.add('in'); return false; }
      return true;
    });
  });

  /* ─── 7. Word-by-word reading lines ─── */
  $$('[data-words]').forEach(function (el) {
    var walk = function (node) {
      $$(':scope > *', node).length; // noop for old engines
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    var words = $$('.w', el);
    onScrollFns.push(function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh * 0.88 - r.top) / (vh * 0.55), 0, 1);
      var n = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
  });

  /* ─── 8. Countdowns (event ticket, training hero) ─── */
  $$('[data-countdown]').forEach(function (stub) {
    var start = new Date(stub.dataset.countdown).getTime(), end = new Date(stub.dataset.countdownEnd).getTime();
    var cells = { d: $('[data-cd="d"]', stub), h: $('[data-cd="h"]', stub), m: $('[data-cd="m"]', stub), s: $('[data-cd="s"]', stub) };
    var lab = $('[data-cd-label]', stub), days = $$('.stub-days li', stub);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var now = Date.now(), diff = Math.max(0, start - now);
      if (now >= start && now < end) {
        if (lab) lab.textContent = 'Live this week';
        var lagosDay = +new Date().toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Africa/Lagos' });
        days.forEach(function (li) { li.classList.toggle('is-live', +li.querySelector('b').textContent === lagosDay); });
      } else if (now >= end && lab) { lab.textContent = 'Recordings coming soon'; }
      var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, sec = Math.floor(diff / 1e3) % 60;
      if (cells.d) cells.d.textContent = pad(d); if (cells.h) cells.h.textContent = pad(h);
      if (cells.m) cells.m.textContent = pad(m); if (cells.s) cells.s.textContent = pad(sec);
    };
    tick(); setInterval(tick, 1000);
  });

  /* ─── 9. The Need: pinned scrollytelling with a 10×10 matrix ─── */
  var scrolly = $('#scrolly'), matrix = $('#matrix'), need = $('#need');
  if (scrolly && matrix) {
    var cellsM = [];
    for (var i = 0; i < 100; i++) {
      var c = document.createElement('i');
      // deterministic scatter for the "drift" state
      var rnd = (Math.sin(i * 91.7) * 43758.5453) % 1; rnd = Math.abs(rnd);
      c.style.setProperty('--dy', -(80 + rnd * 260) + 'px');
      c._r = rnd;
      matrix.appendChild(c); cellsM.push(c);
    }
    var facts = $$('.fact', scrolly), stepN = $('[data-step-n]'), bar2 = $('#scrollyBar'), read = $('[data-matrix-read]');
    var state = '';
    var paint = function (step, sub) {
      var key = step + ':' + sub;
      if (key === state) return; state = key;
      need.setAttribute('data-step', step);
      facts.forEach(function (f, k) { f.classList.toggle('is-on', k === step); f.classList.toggle('is-past', k < step); });
      stepN.textContent = '0' + (step + 1);
      cellsM.forEach(function (c, k) {
        c.className = ''; c.style.setProperty('--dl', '0s');
        if (step === 0) {
          var n = sub ? 39 : 45;              // today ≈ 43–46%  →  2050: 39%
          if (k < n) c.className = 'f';
          c.style.setProperty('--dl', (k >= 39 && k < 45 ? (k - 39) * 0.06 : 0) + 's');
        } else if (step === 1) {
          if (k < 10) c.className = 'f';       // trained
          else if (k < 20) c.className = 'r';  // the 80–90% range
          else c.className = 'h';              // little or no formal training
          c.style.setProperty('--dl', (k * 0.006) + 's');
        } else {
          c.className = c._r < 0.3 ? 'lo up' : 'f';  // direction only — no figure implied
          c.style.setProperty('--dl', (c._r * 0.9) + 's');
        }
      });
      if (read) read.textContent = step === 0 ? (sub ? '2050 · 39' : 'Today ≈ 45') : '';
    };
    paint(0, 0);
    onScrollFns.push(function () {
      var r = scrolly.getBoundingClientRect(), total = scrolly.offsetHeight - window.innerHeight;
      var p = clamp(-r.top / total, 0, 1);
      if (bar2) bar2.style.transform = 'scaleX(' + p + ')';
      var step = p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
      var sub = step === 0 ? (p > 0.14 ? 1 : 0) : 0;
      paint(step, sub);
    });
  }

  /* ─── 10. How we work: expanding panels ─── */
  var accord = $('#accord');
  if (accord) {
    var panels = $$('.panel', accord);
    var open = function (p) {
      panels.forEach(function (x) {
        var on = x === p; x.classList.toggle('is-open', on);
        $('.panel-btn', x).setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    };
    var wide = window.matchMedia('(min-width: 881px)');
    panels.forEach(function (p) {
      var b = $('.panel-btn', p);
      b.addEventListener('click', function () {
        if (!wide.matches && p.classList.contains('is-open')) { p.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); return; }
        open(p);
      });
      if (finePointer) p.addEventListener('mouseenter', function () { if (wide.matches) open(p); });
    });
    accord.addEventListener('keydown', function (e) {
      var i = panels.indexOf(e.target.closest('.panel'));
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      var n = panels[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : panels.length - 1)) % panels.length];
      $('.panel-btn', n).focus(); open(n);
    });
  }

  /* ─── 11. Resource reel: drag, arrows, progress, video facade ─── */
  var reel = $('#reel');
  if (reel) {
    var cards = $$('.reel-card', reel), rBar = $('#reelBar'), rN = $('[data-reel-n]');
    var arrows = $$('[data-reel]');
    var update = function () {
      var max = reel.scrollWidth - reel.clientWidth;
      var p = max > 0 ? reel.scrollLeft / max : 0;
      var w = reel.clientWidth / reel.scrollWidth;
      if (rBar) { rBar.style.width = (w * 100) + '%'; rBar.style.transform = 'translateX(' + (p * (1 / w - 1) * 100) + '%)'; }
      var idx = 0, best = 1e9;
      cards.forEach(function (c, k) { var d = Math.abs(c.offsetLeft - reel.offsetLeft - reel.scrollLeft - parseFloat(getComputedStyle(reel).paddingLeft)); if (d < best) { best = d; idx = k; } });
      if (p > 0.98) idx = cards.length - 1;
      if (rN) rN.textContent = '0' + (idx + 1);
      arrows[0].disabled = reel.scrollLeft < 4; arrows[1].disabled = reel.scrollLeft > max - 4;
      reel._idx = idx;
    };
    reel.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update); update();
    arrows.forEach(function (a) {
      a.addEventListener('click', function () {
        var n = clamp((reel._idx || 0) + (+a.dataset.reel), 0, cards.length - 1);
        reel.scrollTo({ left: cards[n].offsetLeft - cards[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    // mouse drag with inertia
    var down = false, moved = 0, sx = 0, sl = 0, vx = 0, lastX = 0, lastT = 0, raf;
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = lastX = e.clientX; sl = reel.scrollLeft; vx = 0; lastT = performance.now(); cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) reel.classList.add('is-drag');
      reel.scrollLeft = sl - dx;
      var now = performance.now(); vx = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      var v = -vx * 16;
      var glide = function () {
        v *= 0.94; reel.scrollLeft += v;
        if (Math.abs(v) > 0.5 && !reduce) raf = requestAnimationFrame(glide);
        else reel.classList.remove('is-drag');
      };
      if (moved > 5) glide(); else reel.classList.remove('is-drag');
    });
    reel.addEventListener('click', function (e) { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
    reel.addEventListener('keydown', function (e) {
      if (e.target !== reel) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); arrows[1].click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); arrows[0].click(); }
    });

  }

  /* ─── 11b. Video facades (click to load the player) ─── */
    $$('.course-thumb[data-id]').forEach(function (thumb) {
    var id = thumb.getAttribute('data-id');
    var card = thumb.parentElement, name = $('.reel-name, .course-title', card);
    thumb.setAttribute('role', 'button'); thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', 'Play video: ' + (name ? name.textContent : ''));
    var play = function () {
      if (thumb.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = name ? name.textContent : 'Video player';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.setAttribute('allowfullscreen', '');
      thumb.innerHTML = ''; thumb.appendChild(f); thumb.removeAttribute('data-cursor');
    };
    thumb.addEventListener('click', play);
    thumb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });

  /* ─── 12. Scripture marquee — speed follows scroll velocity ─── */
  var track = $('#marquee');
  if (track && !reduce) {
    var item = track.firstElementChild;
    var build = function () {
      $$('.mq-item', track).slice(1).forEach(function (n) { n.remove(); });
      var need2 = Math.ceil((window.innerWidth * 2) / item.offsetWidth) + 1;
      for (var k = 0; k < need2; k++) track.appendChild(item.cloneNode(true));
    };
    build(); window.addEventListener('resize', build);
    var x = 0, vel = 0, lastSY = window.scrollY, onScreen = false;
    new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(track);
    var loop = function () {
      var sy = window.scrollY, d = sy - lastSY; lastSY = sy;
      vel = lerp(vel, d * 0.35, 0.1);
      if (onScreen) {
        x -= 0.9 + Math.abs(vel);
        var w = item.offsetWidth;
        if (-x >= w) x += w;
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ─── 13. Footer wordmark — fit edge to edge ─── */
  var word = $('#footWord');
  if (word) {
    var fit = function () {
      word.style.fontSize = '100px';
      var w = word.scrollWidth, avail = word.parentElement.clientWidth;
      word.style.fontSize = (100 * avail / w) + 'px';
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
    window.addEventListener('resize', fit);
  }

  /* ─── 14. Custom cursor (fine pointers only; native cursor stays) ─── */
  var cursor = $('.cursor');
  if (cursor && finePointer && !reduce) {
    var cl = $('.cursor-label', cursor), cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('on'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor]');
      if (t && !(reel && reel.classList.contains('is-drag'))) { cl.textContent = t.getAttribute('data-cursor'); cursor.classList.add('is-big'); }
      else cursor.classList.remove('is-big');
    });
    var cloop = function () { cx = lerp(cx, tx, 0.22); cy = lerp(cy, ty, 0.22); cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(cloop); };
    requestAnimationFrame(cloop);
  }

  /* ─── 15. Forms (Formspree) — same behaviour as v1 ─── */
  var send = function (form, onOk, onErr) {
    return fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) { if (res.ok) onOk(); else onErr('Something went wrong. Please try again.'); })
      .catch(function () { onErr('Network error. Please try again.'); });
  };
  [['newsForm', 'news-status', 'news-submit'], ['contactForm', 'cf-status', 'cf-submit'], ['trainingForm', 'tr-status', 'tr-submit']].forEach(function (ids) {
    var form = document.getElementById(ids[0]); if (!form) return;
    var st = document.getElementById(ids[1]), btn = document.getElementById(ids[2]);
    var label = $('.letter-go-t', btn) || $('.cta-t', btn) || btn;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      st.className = 'form-status mono'; st.textContent = 'Sending…'; btn.disabled = true; var orig = label.textContent; label.textContent = 'Sending…';
      send(form, function () {
        var redirect = form.getAttribute('data-success-redirect');
        if (ids[0] === 'trainingForm') { try { var fn = (form.elements.name.value || '').trim().split(/\s+/)[0]; if (fn) sessionStorage.setItem('an-reg-name', fn.slice(0, 40)); } catch (err) {} }
        st.classList.add('ok');
        if (redirect) { st.textContent = 'Success — taking you to your details…'; window.location.assign(redirect); return; }
        form.reset(); st.textContent = 'Success — thank you.';
        btn.disabled = false; label.textContent = orig;
      }, function (msg) { st.classList.add('err'); st.textContent = msg; btn.disabled = false; label.textContent = orig; });
    });
  });
  // volunteer form: needs at least one role; shows the WhatsApp step on success
  var vol = document.getElementById('volForm');
  if (vol) {
    var vst = document.getElementById('v-status'), vbtn = document.getElementById('v-submit'), done = document.getElementById('vlSuccess');
    vol.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!vol.querySelectorAll('input[name="roles"]:checked').length) { vst.className = 'form-status mono err'; vst.textContent = 'Please choose at least one role.'; return; }
      vst.className = 'form-status mono'; vst.textContent = 'Sending…'; vbtn.disabled = true;
      send(vol, function () {
        vol.style.display = 'none'; vst.textContent = ''; done.classList.add('on');
        done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }, function () { vst.className = 'form-status mono err'; vst.textContent = 'Something went wrong. Please try again in a moment.'; vbtn.disabled = false; });
    });
  }
  // "Request the curriculum" on the partner page pre-selects that reason on the contact form
  var req = document.getElementById('reqCurriculum');
  if (req) req.addEventListener('click', function () { try { sessionStorage.setItem('an-reason', 'Requesting the curriculum'); } catch (e) {} });
  var reason = document.getElementById('cf-reason');
  if (reason) { try { var r = sessionStorage.getItem('an-reason'); if (r) { reason.value = r; sessionStorage.removeItem('an-reason'); } } catch (e) {} }

  // confirmation page: greet by first name if they just registered in this tab
  var regName = $('[data-reg-name]');
  if (regName) { try { var nm = sessionStorage.getItem('an-reg-name'); if (nm) regName.textContent = ', ' + nm + ','; } catch (e) {} }

  /* ─── 16. Lamp glow on page heroes ─── */
  $$('[data-lamp]').forEach(function (el) {
    if (reduce || !finePointer) return;
    var tx = 0.78, ty = 0.3, cx = tx, cy = ty, on = false;
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; if (!on) { on = true; loop(); } });
    var loop = function () {
      cx = lerp(cx, tx, 0.08); cy = lerp(cy, ty, 0.08);
      el.style.setProperty('--mx', (cx * 100) + '%'); el.style.setProperty('--my', (cy * 100) + '%');
      if (Math.abs(cx - tx) + Math.abs(cy - ty) > 0.001) requestAnimationFrame(loop); else on = false;
    };
  });

  /* ─── 17. Resource library: filters, counts, empty state ─── */
  var tabs = $$('.library-tabs .tab'), libCards = $$('.library-grid .course-card');
  if (tabs.length) {
    var empty = $('.lib-empty'), countEl = $('[data-lib-count]');
    tabs.forEach(function (t) {
      var cat = t.dataset.cat, n = cat === 'all' ? libCards.length : libCards.filter(function (c) { return c.dataset.cat === cat; }).length;
      var sp = document.createElement('span'); sp.className = 'n'; sp.textContent = n; t.appendChild(sp);
    });
    var filter = function (cat) {
      tabs.forEach(function (x) { var on = x.dataset.cat === cat; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var shown = 0;
      libCards.forEach(function (c) { var on = cat === 'all' || c.dataset.cat === cat; c.classList.toggle('is-hidden', !on); if (on) shown++; });
      if (empty) empty.classList.toggle('on', shown === 0);
      if (countEl) countEl.textContent = shown + (shown === 1 ? ' resource' : ' resources');
    };
    var libTop = $('#watch');
    tabs.forEach(function (t) { t.addEventListener('click', function () {
      filter(t.dataset.cat);
      if (libTop && libTop.getBoundingClientRect().top < 0) window.scrollTo({ top: libTop.getBoundingClientRect().top + window.scrollY - 70, behavior: reduce ? 'auto' : 'smooth' });
    }); });
    filter('all');
  }

  /* ─── 18. Deck viewer ─── */
  var viewer = document.getElementById('deckViewer');
  if (viewer) {
    var stage = document.getElementById('dvStage'), trackD = document.getElementById('dvTrack');
    var dBar = document.getElementById('dvBar'), counter = document.getElementById('dvCounter'), series = document.getElementById('dvSeries');
    var prev = document.getElementById('dvPrev'), next = document.getElementById('dvNext'), closeBtn = document.getElementById('dvClose');
    var pages = [], curP = 0, opener = null;
    var render = function () {
      trackD.style.transform = 'translateX(-' + (curP * 100) + '%)';
      counter.textContent = (curP + 1) + ' / ' + pages.length;
      dBar.style.width = ((curP + 1) / pages.length * 100) + '%';
      prev.classList.toggle('is-hidden', curP === 0); next.classList.toggle('is-hidden', curP === pages.length - 1);
      var v = trackD.children[curP]; if (v) v.scrollTop = 0;
      $$('.deckpage', trackD).forEach(function (pg, k) { pg.setAttribute('aria-hidden', k === curP ? 'false' : 'true'); if (k !== curP) pg.setAttribute('inert', ''); else pg.removeAttribute('inert'); });
    };
    var openDeck = function (id, fromEl) {
      var deck = document.querySelector('#deckData .deck[data-deck="' + id + '"]'); if (!deck) return;
      trackD.innerHTML = ''; pages = $$('.deckpage', deck);
      pages.forEach(function (pg) { trackD.appendChild(pg.cloneNode(true)); });
      series.textContent = deck.getAttribute('data-series') || 'Apologetics Nigeria';
      curP = 0; render(); opener = fromEl || null;
      viewer.classList.add('is-open'); viewer.setAttribute('aria-hidden', 'false'); document.body.classList.add('deck-open');
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 50);
    };
    var closeDeck = function () {
      viewer.classList.remove('is-open'); viewer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('deck-open');
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      if (opener) opener.focus({ preventScroll: true });
      setTimeout(function () { if (!viewer.classList.contains('is-open')) { trackD.innerHTML = ''; pages = []; curP = 0; } }, 700);
    };
    var goP = function (d) { if (!pages.length) return; curP = clamp(curP + d, 0, pages.length - 1); render(); };
    $$('.deck-thumb[data-deck]').forEach(function (card) {
      card.addEventListener('click', function () { openDeck(card.dataset.deck, card); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDeck(card.dataset.deck, card); } });
    });
    next.addEventListener('click', function () { goP(1); });
    prev.addEventListener('click', function () { goP(-1); });
    closeBtn.addEventListener('click', closeDeck);
    document.addEventListener('keydown', function (e) {
      if (!viewer.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeDeck();
      else if (e.key === 'ArrowRight') goP(1);
      else if (e.key === 'ArrowLeft') goP(-1);
      else if (e.key === 'Tab') { var f = [closeBtn, prev, next].filter(function (b) { return !b.classList.contains('is-hidden'); }); var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    var sx0 = 0, sy0 = 0;
    viewer.addEventListener('touchstart', function (e) { sx0 = e.touches[0].clientX; sy0 = e.touches[0].clientY; }, { passive: true });
    viewer.addEventListener('touchend', function (e) {
      var dx = sx0 - e.changedTouches[0].clientX, dy = sy0 - e.changedTouches[0].clientY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) goP(dx > 0 ? 1 : -1);
    }, { passive: true });
    // deep link: resources#deck-01 opens that deck (homepage question field uses this)
    var hashDeck = (location.hash.match(/^#(deck-[\w-]+)$/) || [])[1];
    if (hashDeck) openDeck(hashDeck);
  }

  runScroll();
})();
