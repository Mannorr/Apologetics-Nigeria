/* Opened Veil 2027 — register, then pay the commitment fee.
   Step 1: details are sent to Formspree (so nobody is lost if they abandon payment).
   Step 2: the payer goes to Stripe or Flutterwave. Both return to /opened-veil-confirmed.

   ── CONFIG ─────────────────────────────────────────────────────────────── */
var OV = {
  min: 3000,
  // Stripe payment links (account: ADENIRAN-O). Each redirects to /opened-veil-confirmed?provider=stripe&session_id=…
  stripe: {
    3000:   'https://buy.stripe.com/fZufZi3Pyeag6r25GB1wY01',
    5000:   'https://buy.stripe.com/fZufZicm40jq8zafhb1wY02',
    10000:  'https://buy.stripe.com/aFaeVefyg0jq4iUc4Z1wY03',
    custom: 'https://buy.stripe.com/bJe9AUgCk6HOg1Cglf1wY04'  // payer types the amount, Stripe enforces NGN 3,000 minimum
  },
  // Flutterwave. If a PUBLIC key (FLWPUBK-…) is set, checkout opens on this page with the exact amount
  // and returns to /opened-veil-confirmed automatically. Without it, the payment link below is used:
  // set its redirect URL in the Flutterwave dashboard to https://apologeticsnigeria.com/opened-veil-confirmed?provider=flutterwave
  flwPublicKey: '',
  // Flutterwave payment pages (2027 account). One per amount, like Stripe; 'custom' lets the payer type an amount.
  // Set each page's "Redirect after payment" to https://apologeticsnigeria.com/opened-veil-confirmed
  flw: { 3000: '', 5000: '', 10000: '', custom: 'https://flutterwave.com/pay/openedveil' },
  flwLink: 'https://flutterwave.com/pay/qjh7xrxiukiq',  // fallback until the 2027 pages are added
  confirmUrl: 'https://apologeticsnigeria.com/opened-veil-confirmed'
};

(function () {
  var form = document.getElementById('veilForm'); if (!form) return;
  if (OV.flwPublicKey) { var sc = document.createElement('script'); sc.src = 'https://checkout.flutterwave.com/v3.js'; sc.async = true; document.head.appendChild(sc); }
  var st = document.getElementById('ov-status'), btn = document.getElementById('ov-submit');
  var label = btn.querySelector('.cta-t') || btn;
  var other = document.getElementById('ov-amount-other'), otherWrap = document.getElementById('ov-other-wrap');
  var total = document.getElementById('ov-total'), provNote = document.getElementById('ov-prov-note');
  var fmt = function (n) { return '₦' + Number(n).toLocaleString('en-NG'); };

  var choice = function () { var r = form.querySelector('input[name="amount_choice"]:checked'); return r ? r.value : '3000'; };
  var provider = function () { var r = form.querySelector('input[name="provider"]:checked'); return r ? r.value : 'flutterwave'; };
  var amount = function () { var c = choice(); return c === 'other' ? Math.floor(Number(String(other.value).replace(/[^\d.]/g, '')) || 0) : Number(c); };

  var refresh = function () {
    var isOther = choice() === 'other';
    otherWrap.hidden = !isOther; other.required = isOther;
    var a = amount();
    total.textContent = a >= OV.min ? fmt(a) : '—';
    provNote.textContent = provider() === 'stripe'
      ? 'Stripe: card, Apple Pay or Google Pay. Works in Nigeria and abroad.'
      : 'Flutterwave: card, bank transfer or USSD in naira.';
    var lab = { flutterwave: 'Flutterwave', stripe: 'Stripe' }[provider()];
    label.textContent = (a >= OV.min ? 'Pay ' + fmt(a) : 'Continue') + ' with ' + lab;
  };
  form.addEventListener('change', refresh); other.addEventListener('input', refresh); refresh();

  var makeRef = function () { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return 'OV27-' + s; };

  var go = function (d) {
    if (d.provider === 'stripe') {
      var base = OV.stripe[String(d.amount)] || OV.stripe.custom;
      var url = base + '?prefilled_email=' + encodeURIComponent(d.email) + '&client_reference_id=' + encodeURIComponent(d.ref);
      window.location.assign(url); return;
    }
    if (OV.flwPublicKey && window.FlutterwaveCheckout) {
      window.FlutterwaveCheckout({
        public_key: OV.flwPublicKey, tx_ref: d.ref, amount: d.amount, currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        redirect_url: OV.confirmUrl + '?provider=flutterwave',
        customer: { email: d.email, phone_number: d.whatsapp, name: d.name },
        customizations: { title: 'Opened Veil 2027', description: 'Commitment fee · ' + fmt(d.amount), logo: 'https://apologeticsnigeria.com/assets/img/brand/favicon.png' },
        meta: { event: 'opened-veil-2027', ref: d.ref }
      });
      btn.disabled = false; refresh(); return;
    }
    window.location.assign(OV.flw[String(d.amount)] || OV.flw.custom || OV.flwLink);
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = amount();
    if (!(a >= OV.min)) { st.className = 'form-status mono err'; st.textContent = 'The commitment fee starts from ' + fmt(OV.min) + '. Please enter ' + fmt(OV.min) + ' or more.'; (choice() === 'other' ? other : form.querySelector('input[name="amount_choice"]')).focus(); return; }
    var ref = makeRef();
    form.elements.ref.value = ref; form.elements.amount.value = a;
    var d = { ref: ref, amount: a, provider: provider(), name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), whatsapp: form.elements.whatsapp.value.trim() };
    try { sessionStorage.setItem('ov-reg', JSON.stringify({ ref: ref, amount: a, provider: d.provider, first: d.name.split(/\s+/)[0].slice(0, 40), email: d.email })); } catch (err) {}
    st.className = 'form-status mono'; st.textContent = 'Saving your registration…'; btn.disabled = true;
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('bad');
        st.classList.add('ok');
        var flwTyped = d.provider === 'flutterwave' && !OV.flwPublicKey && !OV.flw[String(d.amount)];
        st.textContent = 'Thank you, you are registered (ref ' + ref + '). ' + (flwTyped
          ? 'Taking you to Flutterwave: enter ' + fmt(d.amount) + ' and use the same email on the next page.'
          : 'Taking you to secure payment…');
        setTimeout(function () { go(d); }, flwTyped ? 3200 : 1600);
      })
      .catch(function () { st.className = 'form-status mono err'; st.textContent = 'Something went wrong saving your registration. Please try again.'; btn.disabled = false; refresh(); });
  });
})();

/* ── Confirmation page (/opened-veil-confirmed) ──
   Stripe returns ?provider=stripe&session_id=cs_… (only after a successful payment).
   Flutterwave returns ?provider=flutterwave&status=successful|cancelled&tx_ref=…&transaction_id=… */
(function () {
  var box = document.getElementById('ovDone'); if (!box) return;
  // tolerate redirects that append "?status=…" to a URL that already has a query string
  var q = new URLSearchParams(location.search.replace(/\?/g, '&').replace(/^&/, ''));
  var prov = (q.get('provider') || '').toLowerCase();
  if (!prov && (q.get('transaction_id') || q.get('tx_ref') || q.get('status'))) prov = 'flutterwave';
  var status = (q.get('status') || '').toLowerCase();
  var reg = {}; try { reg = JSON.parse(sessionStorage.getItem('ov-reg') || '{}'); } catch (e) {}
  var state = 'unknown';
  if (prov === 'stripe' && q.get('session_id')) state = 'paid';
  if (prov === 'flutterwave') state = (status === 'successful' || status === 'completed') ? 'paid' : (status ? 'failed' : 'unknown');
  box.querySelectorAll('[data-state]').forEach(function (el) { el.hidden = el.getAttribute('data-state') !== state; });
  var fmt = function (n) { return n ? '₦' + Number(n).toLocaleString('en-NG') : '—'; };
  var set = function (k, v) { var el = box.querySelector('[data-ov="' + k + '"]'); if (el && v) el.textContent = v; };
  set('ref', q.get('tx_ref') || reg.ref); set('amount', fmt(reg.amount)); set('provider', { stripe: 'Stripe', flutterwave: 'Flutterwave' }[prov]);
  var first = box.querySelector('[data-ov-first]'); if (first && reg.first) first.textContent = ', ' + reg.first;

  // record the return on Formspree once, so payments can be matched to registrations
  var key = 'ov-sent-' + (q.get('session_id') || q.get('transaction_id') || q.get('tx_ref') || '');
  var sent = false; try { sent = !!sessionStorage.getItem(key); } catch (e) {}
  if (state !== 'unknown' && !sent) {
    var fd = new FormData();
    fd.append('_subject', (state === 'paid' ? 'PAID' : 'Payment not completed') + ' — Opened Veil 2027 ' + (reg.ref || q.get('tx_ref') || ''));
    fd.append('form_type', 'Payment return — Opened Veil 2027');
    fd.append('payment_status', state === 'paid' ? 'Paid (returned from ' + prov + ')' : 'Not completed (' + status + ')');
    fd.append('ref', reg.ref || q.get('tx_ref') || ''); fd.append('email', reg.email || ''); fd.append('amount', reg.amount || '');
    fd.append('provider', prov); fd.append('stripe_session', q.get('session_id') || ''); fd.append('flutterwave_transaction', q.get('transaction_id') || '');
    fetch('https://formspree.io/f/mgavgvaz', { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function () { try { sessionStorage.setItem(key, '1'); } catch (e) {} }).catch(function () {});
  }
})();

/* ── Coming soon gate on /opened-veil ── */
(function () {
  var soon = document.getElementById('ovSoon'); if (!soon || !window.OV_OPENS) return;
  var at = new Date(window.OV_OPENS).getTime(), root = document.documentElement, pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var tick = function () {
    var diff = at - Date.now();
    if (diff <= 0) { if (root.classList.contains('ov-locked')) { root.classList.remove('ov-locked'); window.scrollTo(0, 0); } return false; }
    var v = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
    soon.querySelectorAll('[data-oc]').forEach(function (c) { c.textContent = pad(v[c.getAttribute('data-oc')]); });
    return true;
  };
  if (tick()) { var iv = setInterval(function () { if (!tick()) clearInterval(iv); }, 1000); }
})();
