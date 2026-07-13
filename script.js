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


  // ═══════════ RESOURCE DECK VIEWER (on-page presentations) ═══════════
  (function(){
    var viewer=document.getElementById('deckViewer');
    if(!viewer) return;
    var stage=document.getElementById('dvStage'), track=document.getElementById('dvTrack');
    var bar=document.getElementById('dvBar'), counter=document.getElementById('dvCounter'), series=document.getElementById('dvSeries');
    var prev=document.getElementById('dvPrev'), next=document.getElementById('dvNext'), closeBtn=document.getElementById('dvClose');
    var pages=[], cur=0;
    function render(){
      track.style.transform='translateX(-'+(cur*100)+'%)';
      counter.textContent=(cur+1)+' / '+pages.length;
      bar.style.width=((cur+1)/pages.length*100)+'%';
      prev.classList.toggle('is-hidden', cur===0);
      next.classList.toggle('is-hidden', cur===pages.length-1);
      stage.scrollTop=0;
      var visible=track.children[cur]; if(visible) visible.scrollTop=0;
    }
    function openDeck(id){
      var deck=document.querySelector('#deckData .deck[data-deck="'+id+'"]');
      if(!deck) return;
      track.innerHTML='';
      pages=Array.prototype.slice.call(deck.querySelectorAll('.deckpage'));
      pages.forEach(function(p){ track.appendChild(p.cloneNode(true)); });
      series.textContent=deck.getAttribute('data-series')||'Apologetics Nigeria';
      cur=0; render();
      viewer.classList.add('is-open'); viewer.setAttribute('aria-hidden','false');
      document.body.style.overflow='hidden';
      closeBtn.focus();
    }
    function closeDeck(){
      viewer.classList.remove('is-open'); viewer.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      setTimeout(function(){ track.innerHTML=''; pages=[]; cur=0; }, 320);
    }
    function go(d){ cur=Math.max(0, Math.min(pages.length-1, cur+d)); render(); }
    document.querySelectorAll('.deck-thumb[data-deck]').forEach(function(card){
      var id=card.getAttribute('data-deck');
      card.addEventListener('click', function(){ openDeck(id); });
      card.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDeck(id); } });
    });
    next.addEventListener('click', function(){ go(1); });
    prev.addEventListener('click', function(){ go(-1); });
    closeBtn.addEventListener('click', closeDeck);
    track.addEventListener('click', function(e){ if(e.target.closest('[data-close-deck]')) closeDeck(); });
    document.addEventListener('keydown', function(e){
      if(!viewer.classList.contains('is-open')) return;
      if(e.key==='Escape') closeDeck();
      else if(e.key==='ArrowRight') go(1);
      else if(e.key==='ArrowLeft') go(-1);
    });
    var x0=null;
    stage.addEventListener('touchstart', function(e){ x0=e.touches[0].clientX; }, {passive:true});
    stage.addEventListener('touchend', function(e){
      if(x0===null) return;
      var dx=e.changedTouches[0].clientX - x0;
      if(Math.abs(dx)>50) go(dx<0?1:-1);
      x0=null;
    }, {passive:true});
  })();
