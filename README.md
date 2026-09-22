# Apologetics Nigeria

Static site. No build step. Deployed on Vercel straight from `main`.

---

## Structure

```
/                            Pages only — every .html here is a live URL
  index.html                 Home
  training.html              Defending the Faith — event page + registration form
  registered.html            Post-registration thank-you (noindex)
  join.html                  Permanent joining page — see "The join page" below
  resources.html             Talks, decks and video library
  about.html  beliefs.html  partner.html  contact.html  privacy.html
  vercel.json                Deploy config + legacy URL rewrites

/assets
  /css/v2.css                The stylesheet every page uses
  /js/v2.js                  All behaviour: nav, menu, forms, deck viewer, filters,
                             countdowns, homepage interactions. No dependencies.
  /fonts                     Archivo, Newsreader, IBM Plex Mono (self-hosted)
  /css/styles.css            v1 — no page uses it. Kept only because vercel.json
  /js/script.js              still serves /styles.css and /script.js (see Rules)
  /img
    /brand                   logo, favicon, og-image, founder, signature logos
    /training                Speaker posters, event posters, banners
    /email                   Hero images used by HTML emails (absolute URLs)
  /files
    defending-the-faith.ics  Calendar file — 3 events, 2 reminders each
    defending-the-faith-attendee-pack.pdf
                             6-page attendee pack, downloaded from registered.html

/templates
  email-signature.html       Copy-paste email signatures (open in a browser)
  email-reminder.html        Mailchimp reminder email (Code your own → Paste in code)
  attendee-pack/             Source of the attendee pack PDF. Edit pack.html, then
                             run `python3 render.py` inside the folder (needs Playwright)
```

---

## Rules

**Pages stay at the root.** Their URLs are printed in PDFs, emails and calendar
entries that cannot be edited after sending. Never move or rename a `.html` file
at the root.

**Never publish the raw Google Meet link.** The only address that goes out is
`apologeticsnigeria.com/join.html`. The Meet URL lives in exactly one line of
`join.html`. If the meeting room changes, edit that line and redeploy — every
email, PDF and calendar entry already sent keeps working.

**Legacy rewrites in `vercel.json` are load-bearing.** Assets moved into
`/assets` after some URLs had already been published. The rewrites serve the new
files at the old paths. Do not remove them.

**Email images must be absolute URLs.** Email clients cannot resolve relative
paths, so anything in `/assets/img/email` is referenced as
`https://apologeticsnigeria.com/assets/img/email/...`.

---

## The join page

`join.html` exists so the meeting link can change without breaking anything.
To update it:

1. Open `join.html`
2. Change the `href` on the join button — it is marked with a comment
3. Commit and push; Vercel redeploys in about a minute

Do this *before* announcing any change. The page updates silently.

---

## Brand

| Token      | Hex       | Used for                                   |
|------------|-----------|--------------------------------------------|
| Paper      | `#FEFCFF` | Light card backgrounds                      |
| Ink        | `#040C0E` | Body type on light surfaces, solid blocks   |
| Deep teal  | `#1E2C2F` | Dark card backgrounds                       |
| Cyan       | `#4AC7CB` | Upper footer strip, accents on dark         |
| Yellow     | `#FEC94B` | Lower footer strip, labels on dark          |
| Red        | `#E70804` | Eyebrow labels, rules, primary buttons      |

Website type (v2): **Archivo** condensed for headlines, **Newsreader** for body and
italic accents, **IBM Plex Mono** for labels and metadata — all in `/assets/fonts`.
Motif: the slanted corner cut from the logomark, used on buttons, cards and images.
Print and social work uses **Bodoni Moda** at low optical size for display.

Website colours are `--ink #040C0E`, `--paper #F6F2E9`, `--paper-2 #EDE7DA`,
`--gold #A9803F`, `--gold-2 #C9A25A`, `--stone #6B6659`, `--stone-2 #8B958F`.

---

## Forms

All forms post to Formspree and are handled in `assets/js/v2.js` (section 15).

| Form         | Endpoint                          | On success                |
|--------------|-----------------------------------|---------------------------|
| Contact      | `formspree.io/f/mkolkrqb`         | Inline confirmation       |
| Registration | `formspree.io/f/xqpkbrwp`         | Redirects to `registered.html` |
| Newsletter   | `formspree.io/f/mkolkrqb`         | Inline confirmation       |
| Volunteers   | `formspree.io/f/mzezbggj`         | Shows the WhatsApp step   |

The redirect is driven by `data-success-redirect` on the form element, with
Formspree's `_next` field as a no-JavaScript fallback.

---

## Checking nothing broke

```
python3 tests/check.py verify
```

Runs ~550 checks on every page — links, forms, decks, videos, mobile menu, meta
tags, legacy URLs — against `tests/baseline.json`. See `tests/FUNCTIONALITY.md`.
Only re-record the baseline (`snapshot`) on purpose, from a version you trust.

---

## After the event (18 October 2026)

Remove or archive:

- The ticket section in `index.html` — marked `remove after 18 Oct 2026`
  (the `.ticket` / `.promo` rules in `v2.css` can stay; nothing else uses them)

Keep `training.html` and `join.html` live as a record.
