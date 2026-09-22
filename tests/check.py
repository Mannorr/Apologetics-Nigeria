#!/usr/bin/env python3
"""
Functionality guard for apologeticsnigeria.com

  python3 tests/check.py snapshot   # record what the site does today -> tests/baseline.json
  python3 tests/check.py verify     # prove the current files still do all of it

`verify` never sends real form submissions: Formspree is intercepted.
Needs: pip install playwright  (and a Chromium; run `playwright install chromium` once)
"""
import json, os, re, sys, threading, mimetypes, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'tests', 'baseline.json')
PAGES = sorted(f for f in os.listdir(ROOT) if f.endswith('.html'))
VERCEL = json.load(open(os.path.join(ROOT, 'vercel.json')))
REWRITES = {r['source']: r['destination'] for r in VERCEL.get('rewrites', [])}
PORT = 8931
BASE = f'http://localhost:{PORT}'
FORM_HOST = 'formspree.io'

# ── a local server that behaves like Vercel (cleanUrls + rewrites) ──────────
class Vercelish(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = unquote(urlparse(path).path)
        if p in REWRITES: p = REWRITES[p]
        full = os.path.join(ROOT, p.lstrip('/'))
        if p == '/': full = os.path.join(ROOT, 'index.html')
        elif not os.path.splitext(p)[1] and os.path.exists(full + '.html'): full += '.html'
        return full
    def guess_type(self, path):
        return 'text/calendar' if path.endswith('.ics') else super().guess_type(path)

def serve():
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Vercelish, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

# ── what a page promises (compared against the baseline) ────────────────────
CONTRACT_JS = r"""
() => {
  const meta = n => (document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)||{}).content || null;
  const norm = h => { try { const u = new URL(h, location.href);
      if (u.origin === location.origin) return u.pathname.replace(/\.html$/,'').replace(/^\/index$/,'/') + u.hash;
      return u.href; } catch(e) { return h; } };
  const links = [...new Set([...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('javascript') && h !== '#').map(norm))].sort();
  const forms = [...document.querySelectorAll('form')].map(f => ({
    id: f.id, action: f.getAttribute('action'), method: (f.getAttribute('method')||'get').toLowerCase(),
    redirect: f.getAttribute('data-success-redirect'),
    fields: [...f.querySelectorAll('input,select,textarea')].filter(el => el.name).map(el => ({
      name: el.name, type: el.tagName === 'SELECT' ? 'select' : (el.type || el.tagName.toLowerCase()),
      required: el.required, value: el.type === 'hidden' ? el.value : undefined,
      options: el.tagName === 'SELECT' ? [...el.options].map(o => o.value) : undefined,
      choice: (el.type === 'checkbox' || el.type === 'radio') ? el.value : undefined,
      accept: el.type === 'file' ? el.accept : undefined })) }));
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent) } catch(e) { return 'INVALID' } });
  return {
    title: document.title, lang: document.documentElement.lang,
    meta: { description: meta('description'), robots: meta('robots'), 'og:title': meta('og:title'), 'og:description': meta('og:description'),
            'og:image': meta('og:image'), 'og:url': meta('og:url'), 'twitter:card': meta('twitter:card'), 'twitter:image': meta('twitter:image') },
    canonical: (document.querySelector('link[rel=canonical]')||{}).href || null,
    favicon: !!document.querySelector('link[rel~=icon]'),
    ld, links, forms,
    ids: [...document.querySelectorAll('[id]')].map(e => e.id).sort(),
    decks: [...new Set([...document.querySelectorAll('[data-deck]')].map(e => e.dataset.deck))].sort(),
    videos: [...new Set([...document.querySelectorAll('[data-id]')].map(e => e.dataset.id))].sort(),
    h1: [...document.querySelectorAll('h1')].map(h => (h.getAttribute('aria-label') || h.textContent).replace(/\s+/g,' ').trim()),
  };
}
"""

class Report:
    def __init__(s): s.fails, s.warns, s.passes = [], [], 0
    def ok(s, cond, page, msg, warn=False):
        if cond: s.passes += 1
        else: (s.warns if warn else s.fails).append(f'{page}: {msg}')
        return cond

def open_page(ctx, url, errors):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'JS error: {e}'))
    pg.on('response', lambda r: errors.append(f'{r.status} {r.url}') if r.url.startswith(BASE) and r.status >= 400 else None)
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(400)
    return pg

def block_noise(ctx, form_status=200):
    ctx.route(re.compile(r'https://(i\.ytimg\.com|fonts\.(googleapis|gstatic)\.com|www\.youtube-nocookie\.com)/.*'), lambda r: r.abort())
    ctx.route(re.compile(r'https://formspree\.io/.*'),
              lambda r: r.fulfill(status=form_status, content_type='application/json', body='{"ok":true,"next":"/thanks"}' if form_status == 200 else '{"error":"x"}'))

def snapshot():
    srv = serve(); data = {}
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(); block_noise(ctx)
        for f in PAGES:
            errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
            data[f] = pg.evaluate(CONTRACT_JS); pg.close()
        b.close()
    srv.shutdown()
    json.dump(data, open(BASELINE, 'w'), indent=1, sort_keys=True)
    print(f'Baseline written for {len(data)} pages -> tests/baseline.json')

# ── behaviour checks: run on whatever markup is there ───────────────────────
def fill_form(pg, form):
    for el in form.query_selector_all('input,select,textarea'):
        t = (el.get_attribute('type') or el.evaluate('e => e.tagName')).lower()
        if not el.is_visible() and t not in ('checkbox', 'radio'): continue
        if t in ('hidden', 'submit', 'button', 'file'): continue
        if t in ('checkbox', 'radio'):
            name = el.get_attribute('name')
            if not form.query_selector(f'input[name="{name}"]:checked'): el.evaluate('e => { e.checked = true; e.dispatchEvent(new Event("change",{bubbles:true})) }')
        elif t == 'select':
            vals = [v for v in el.evaluate('e => [...e.options].map(o => o.value)') if v]
            if vals: el.select_option(vals[0])
        elif t == 'email': el.fill('test@example.com')
        elif t == 'tel': el.fill('08000000000')
        elif t == 'url': el.fill('https://example.com')
        elif t == 'number': el.fill('1')
        elif t == 'date': el.fill('2026-10-16')
        else: el.fill('Test entry')

def submit_and_read(pg, form_id):
    form = pg.query_selector(f'#{form_id}')
    fill_form(pg, form)
    btn = form.query_selector('button[type=submit],input[type=submit],button:not([type])')
    btn.scroll_into_view_if_needed(); btn.click()
    pg.wait_for_timeout(1200)
    return pg

def behaviours(ctx, ctx_err, ctx_mobile, rep, base):
    # 1. every internal link resolves, every #anchor exists on its target page
    page_ids = {}
    for f in PAGES:
        errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
        page_ids['/' + f[:-5] if f != 'index.html' else '/'] = set(pg.evaluate('() => [...document.querySelectorAll("[id]")].map(e => e.id)'))
        rep.ok(not [e for e in errs if 'JS error' in e], f, 'JS errors: ' + '; '.join(e for e in errs if 'JS error' in e))
        rep.ok(not [e for e in errs if 'JS error' not in e], f, 'broken asset requests: ' + '; '.join(e for e in errs if 'JS error' not in e))
        pg.close()
    for f in PAGES:
        errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
        for href in pg.evaluate(CONTRACT_JS)['links']:
            if href.startswith('http') or href.startswith('mailto') or href.startswith('tel'): continue
            path, _, frag = href.partition('#')
            if path and not path.startswith('/'): continue
            status = pg.request.get(BASE + (path or '/'+f)).status
            rep.ok(status == 200, f, f'link {href} -> HTTP {status}')
            target = path or ('/' + f[:-5] if f != 'index.html' else '/')
            if frag and not frag.startswith('deck-') and target in page_ids:
                rep.ok(frag in page_ids[target], f, f'link {href}: no element with id="{frag}" on {target}')
        pg.close()

    # 2. mobile menu opens and shows the site links
    for f in PAGES:
        if f in ('join.html',): continue
        errs = []; pg = open_page(ctx_mobile, f'{BASE}/{f}', errs)
        tog = pg.query_selector('#menuBtn, #navtoggle')
        if not tog: pg.close(); continue
        tog.click(); pg.wait_for_timeout(900)
        vis = pg.evaluate('''() => [...document.querySelectorAll('#menu a, #navlinks a')].filter(a => {
            const r = a.getBoundingClientRect(); const s = getComputedStyle(a);
            return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && s.visibility !== 'hidden' && +s.opacity > .2 &&
                   document.elementFromPoint(r.left + r.width/2, r.top + r.height/2)?.closest('a') === a }).length''')
        rep.ok(vis >= 5, f, f'mobile menu: only {vis} links visible after tapping the menu button')
        pg.close()

    # 3. forms: success path and failure path (Formspree intercepted)
    for f, fdefs in ((f, base[f]['forms']) for f in PAGES if base.get(f, {}).get('forms')):
        for fd in fdefs:
            if not fd['id']: continue
            errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
            posted = []
            pg.on('request', lambda r: posted.append(r) if FORM_HOST in r.url and r.method == 'POST' else None)
            if not pg.query_selector(f'#{fd["id"]}'):
                rep.ok(False, f, f'form #{fd["id"]} is missing'); pg.close(); continue
            submit_and_read(pg, fd['id'])
            rep.ok(len(posted) == 1, f, f'form #{fd["id"]}: expected 1 POST to Formspree, saw {len(posted)}')
            if posted:
                body = posted[0].post_data or ''
                for fld in fd['fields']:
                    if fld['type'] == 'hidden' or fld['required']:
                        rep.ok(f'name="{fld["name"]}"' in body, f, f'form #{fd["id"]}: field "{fld["name"]}" not sent')
            if fd['redirect']:
                rep.ok(fd['redirect'].replace('.html', '') in pg.url, f, f'form #{fd["id"]}: did not go to {fd["redirect"]} after success (at {pg.url})')
            else:
                ok = pg.evaluate('''() => /success|thank|step left/i.test(document.body.innerText) &&
                    [...document.querySelectorAll('[role=status],[aria-live],[id*=uccess],[class*=uccess],.form-status')].some(e => e.offsetParent && /success|thank|step left|join the group/i.test(e.innerText))''')
                rep.ok(bool(ok), f, f'form #{fd["id"]}: no success message shown')
            pg.close()
            # failure path
            errs = []; pg = open_page(ctx_err, f'{BASE}/{f}', errs)
            submit_and_read(pg, fd['id'])
            txt = pg.evaluate('() => document.body.innerText')
            rep.ok(bool(re.search(r'went wrong|try again|error', txt, re.I)), f, f'form #{fd["id"]}: no error message when Formspree fails')
            btn = pg.query_selector(f'#{fd["id"]} button[type=submit], #{fd["id"]} button:not([type])')
            rep.ok(btn is None or btn.is_enabled(), f, f'form #{fd["id"]}: submit button stays disabled after a failure')
            pg.close()

    # 4. video facades load the player
    for f in PAGES:
        if not base.get(f, {}).get('videos'): continue
        errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
        vid = base[f]['videos'][0]
        el = pg.query_selector(f'[data-id="{vid}"]')
        if rep.ok(el is not None, f, f'video {vid} missing'):
            el.scroll_into_view_if_needed(); el.click(); pg.wait_for_timeout(300)
            rep.ok(pg.query_selector(f'iframe[src*="/embed/{vid}"]') is not None, f, f'clicking video {vid} does not load the player')
        pg.close()

    # 5. resources: filter tabs, every deck opens and pages, deep link
    if 'resources.html' in PAGES:
        f = 'resources.html'; errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs)
        for cat in pg.evaluate('() => [...document.querySelectorAll(".library-tabs .tab")].map(t => t.dataset.cat)'):
            pg.click(f'.library-tabs .tab[data-cat="{cat}"]'); pg.wait_for_timeout(150)
            wrong = pg.evaluate(f'''() => [...document.querySelectorAll(".library-grid .course-card")].filter(c => {{
                const shown = c.offsetParent !== null; const match = "{cat}" === "all" || c.dataset.cat === "{cat}"; return shown !== match }}).length''')
            rep.ok(wrong == 0, f, f'filter "{cat}": {wrong} cards shown/hidden wrongly')
        pg.click('.library-tabs .tab[data-cat="all"]')
        for d in base[f]['decks']:
            card = pg.query_selector(f'.deck-thumb[data-deck="{d}"]')
            if not rep.ok(card is not None, f, f'deck {d}: card missing'): continue
            card.scroll_into_view_if_needed(); card.click(); pg.wait_for_timeout(250)
            opened = pg.evaluate('() => document.getElementById("deckViewer")?.classList.contains("is-open")')
            counter = pg.evaluate('() => document.getElementById("dvCounter")?.textContent || ""')
            rep.ok(bool(opened) and re.match(r'1 / \d+', counter or ''), f, f'deck {d}: viewer did not open on page 1 (counter "{counter}")')
            pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(120)
            c2 = pg.evaluate('() => document.getElementById("dvCounter")?.textContent || ""')
            total = int(counter.split('/')[-1]) if '/' in counter else 0
            rep.ok(total < 2 or c2.startswith('2 /'), f, f'deck {d}: next page did not advance ("{c2}")')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(350)
            rep.ok(not pg.evaluate('() => document.getElementById("deckViewer").classList.contains("is-open")'), f, f'deck {d}: Escape did not close the viewer')
        pg.close()
        errs = []; pg = open_page(ctx, f'{BASE}/resources#deck-01', errs)
        rep.ok(pg.evaluate('() => document.getElementById("deckViewer")?.classList.contains("is-open")'), f, 'resources#deck-01 does not open deck-01', warn='deck-01' not in str(base.get('index.html', {}).get('links', [])))
        pg.close()

    # 6. the join page and calendar file (printed in emails — must never break)
    if 'join.html' in PAGES:
        errs = []; pg = open_page(ctx, f'{BASE}/join', errs)
        n = pg.evaluate('() => document.querySelectorAll("a[href*=\'meet.google.com\']").length')
        rep.ok(n == 1, 'join.html', f'expected exactly 1 Google Meet link, found {n}'); pg.close()
    r = ctx.request.get(f'{BASE}/assets/files/defending-the-faith.ics')
    rep.ok(r.status == 200 and b'BEGIN:VCALENDAR' in r.body(), 'calendar', '.ics file missing or invalid')
    r = ctx.request.get(f'{BASE}/assets/files/defending-the-faith-attendee-pack.pdf')
    rep.ok(r.status == 200 and r.body()[:5] == b'%PDF-', 'attendee pack', 'attendee pack PDF missing or invalid')
    r = ctx.request.get(f'{BASE}/assets/files/apologetics-nigeria-profile.pdf')
    rep.ok(r.status == 200 and r.body()[:5] == b'%PDF-', 'ministry profile', 'ministry profile PDF missing or invalid')
    for src in REWRITES:
        s = ctx.request.get(BASE + src).status
        rep.ok(s == 200, 'vercel.json', f'legacy URL {src} -> {s}')

def compare(base, cur, rep):
    for f in base:
        if f not in cur: rep.ok(False, f, 'PAGE DELETED'); continue
        b, c = base[f], cur[f]
        for k in ('title', 'lang', 'canonical', 'favicon'):
            rep.ok(b[k] == c[k], f, f'{k} changed: {b[k]!r} -> {c[k]!r}')
        for k, v in b['meta'].items():
            rep.ok(v == c['meta'].get(k), f, f'meta {k} changed: {v!r} -> {c["meta"].get(k)!r}')
        rep.ok(b['ld'] == c['ld'], f, 'structured data (JSON-LD) changed')
        rep.ok(b['h1'] == c['h1'], f, f'H1 changed: {b["h1"]} -> {c["h1"]}', warn=True)
        lost = [l for l in b['links'] if l not in c['links']]
        rep.ok(not lost, f, 'links no longer on the page: ' + ', '.join(lost))
        rep.ok(set(b['decks']) <= set(c['decks']), f, 'decks lost: ' + ', '.join(sorted(set(b['decks']) - set(c['decks']))))
        rep.ok(set(b['videos']) <= set(c['videos']), f, 'videos lost: ' + ', '.join(sorted(set(b['videos']) - set(c['videos']))))
        bids = [i for i in b['ids'] if i in {l.partition('#')[2] for p in base.values() for l in p['links']}]
        rep.ok(all(i in c['ids'] for i in bids), f, 'linked anchors lost: ' + ', '.join(i for i in bids if i not in c['ids']))
        cf = {x['id'] or x['action']: x for x in c['forms']}
        for bf in b['forms']:
            key = bf['id'] or bf['action']; now = cf.get(key)
            if not rep.ok(now is not None, f, f'form {key} missing'): continue
            for k in ('action', 'method', 'redirect'):
                rep.ok(bf[k] == now[k], f, f'form {key}: {k} changed {bf[k]!r} -> {now[k]!r}')
            sig = lambda fl: json.dumps(fl, sort_keys=True)
            bset, nset = {sig(x) for x in bf['fields']}, {sig(x) for x in now['fields']}
            for x in bf['fields']:
                rep.ok(sig(x) in nset, f, f'form {key}: field changed or missing -> {x["name"]} ({x["type"]})')

def verify():
    if not os.path.exists(BASELINE): sys.exit('No baseline. Run: python3 tests/check.py snapshot  (on the version you trust)')
    base = json.load(open(BASELINE)); srv = serve(); rep = Report()
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx = br.new_context(viewport={'width': 1440, 'height': 900}); block_noise(ctx)
        ctx_err = br.new_context(viewport={'width': 1440, 'height': 900}); block_noise(ctx_err, 500)
        ctx_m = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); block_noise(ctx_m)
        cur = {}
        for f in PAGES:
            errs = []; pg = open_page(ctx, f'{BASE}/{f}', errs); cur[f] = pg.evaluate(CONTRACT_JS); pg.close()
        compare(base, cur, rep)
        behaviours(ctx, ctx_err, ctx_m, rep, base)
        br.close()
    srv.shutdown()
    print(f'\n{rep.passes} checks passed · {len(rep.fails)} failed · {len(rep.warns)} warnings\n')
    for w in rep.warns: print('  WARN ', w)
    for e in rep.fails: print('  FAIL ', e)
    sys.exit(1 if rep.fails else 0)

if __name__ == '__main__':
    {'snapshot': snapshot, 'verify': verify}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
