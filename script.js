  // sticky nav state
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  // mobile menu
  const toggle = document.getElementById('navtoggle');
  const links = document.getElementById('navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded','false'); document.body.style.overflow='';
  }));

  // reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
  revealEls.forEach(el => io.observe(el));
  // safety net: nothing should ever remain invisible
  setTimeout(() => revealEls.forEach(el => el.classList.add('in')), 2600);

  // hero load-in
  window.addEventListener('load', () => {
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('in'));
  });

  // count-up for the 39% stat
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counter = document.querySelector('.num[data-count]');
  if(counter && !prefersReduced){
    const target = +counter.dataset.count, suffix = counter.dataset.suffix || '';
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting){
          let cur = 0; const step = Math.max(1, Math.round(target/40));
          const tick = () => { cur = Math.min(target, cur+step); counter.textContent = cur+suffix; if(cur<target) requestAnimationFrame(tick); };
          tick(); cio.unobserve(e.target);
        }
      });
    }, {threshold:.6});
    cio.observe(counter);
  }

  // pre-select "Requesting the curriculum" when arriving from the curriculum CTA
  const reqBtn = document.getElementById('reqCurriculum');
  const reasonSel = document.getElementById('cf-reason');
  if(reqBtn && reasonSel){
    reqBtn.addEventListener('click', () => { reasonSel.value = 'Requesting the curriculum'; });
  }

  // watch — click a thumbnail to load the inline player (facade pattern, no external navigation)
  document.querySelectorAll('.course-thumb[data-id]').forEach((thumb) => {
    const id = thumb.getAttribute('data-id');
    if(!id) return; // placeholder card, no video wired yet
    thumb.setAttribute('role','button');
    thumb.setAttribute('tabindex','0');
    thumb.setAttribute('aria-label','Play video');
    const play = () => {
      if(thumb.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      iframe.title = 'Video player';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.setAttribute('allowfullscreen','');
      thumb.innerHTML = '';
      thumb.appendChild(iframe);
    };
    thumb.addEventListener('click', play);
    thumb.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); play(); } });
  });

  // library — topic tab filter
  const libTabs = document.querySelectorAll('.library-tabs .tab');
  const libCards = document.querySelectorAll('.library-grid .course-card');
  libTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      libTabs.forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-selected','false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected','true');
      const cat = tab.dataset.cat;
      libCards.forEach((c) => c.classList.toggle('is-hidden', !(cat === 'all' || c.dataset.cat === cat)));
    });
  });

  // newsletter — AJAX subscribe to Formspree
  (function(){
    const form = document.getElementById('newsForm');
    if(!form) return;
    const statusEl = document.getElementById('news-status');
    const submitBtn = document.getElementById('news-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.className = 'form-status';
      statusEl.textContent = 'Subscribing…';
      const original = submitBtn.textContent;
      submitBtn.disabled = true; submitBtn.textContent = 'Subscribing…';
      try{
        const res = await fetch(form.action, { method:'POST', body:new FormData(form), headers:{'Accept':'application/json'} });
        if(res.ok){ form.reset(); statusEl.classList.add('ok'); statusEl.textContent = 'You\u2019re in — thank you. Watch your inbox.'; }
        else { statusEl.classList.add('err'); statusEl.textContent = 'Something went wrong. Please try again.'; }
      }catch(err){ statusEl.classList.add('err'); statusEl.textContent = 'Network error. Please try again.'; }
      finally{ submitBtn.disabled = false; submitBtn.textContent = original; }
    });
  })();

  // contact form — AJAX submit to Formspree, styled inline status
  const form = document.getElementById('contactForm');
  if(form){
    const statusEl = document.getElementById('cf-status');
    const submitBtn = document.getElementById('cf-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.className = 'form-status';
      statusEl.textContent = 'Sending…';
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
      try{
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if(res.ok){
          form.reset();
          statusEl.classList.add('ok');
          statusEl.textContent = 'Thank you — your message has been sent. We\u2019ll be in touch soon.';
        } else {
          let msg = 'Something went wrong. Please try again, or email us directly.';
          try { const data = await res.json(); if(data && data.errors) msg = data.errors.map(x => x.message).join(', '); } catch(_){}
          statusEl.classList.add('err');
          statusEl.textContent = msg;
        }
      } catch(err){
        statusEl.classList.add('err');
        statusEl.textContent = 'Network error. Please try again, or email us directly.';
      } finally {
        submitBtn.disabled = false; submitBtn.textContent = originalLabel;
      }
    });
  }

  // active nav link by current page (multi-page)
  (function(){
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var page = file.replace('.html','') || 'index';
    document.querySelectorAll('.nav-links a.lk').forEach(function(a){
      if(a.getAttribute('data-page') === page){ a.classList.add('is-current'); a.setAttribute('aria-current','page'); }
    });
  })();
