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
  /css/styles.css            Single global stylesheet
  /js/script.js              Nav, reveal animations, form submission
  /img
    /brand                   logo, favicon, og-image, founder, signature logos
    /training                Speaker posters, event posters, banners
    /email                   Hero images used by HTML emails (absolute URLs)
  /files
    defending-the-faith.ics  Calendar file — 3 events, 2 reminders each

/templates
  email-signature.html       Copy-paste email signatures (open in a browser)
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

Type: **Newsreader** for display and quotes, **Inter** for UI and body.
Print and social work uses **Bodoni Moda** at low optical size for display.

---

## Forms

Both forms post to Formspree and are handled by `handleFormSubmit` in
`assets/js/script.js`.

| Form         | Endpoint                          | On success                |
|--------------|-----------------------------------|---------------------------|
| Contact      | `formspree.io/f/mkolkrqb`         | Inline confirmation       |
| Registration | `formspree.io/f/xqpkbrwp`         | Redirects to `registered.html` |

The redirect is driven by `data-success-redirect` on the form element, with
Formspree's `_next` field as a no-JavaScript fallback.

---

## After the event (18 October 2026)

Remove or archive:

- Training banner block in `index.html` — marked `remove after 18 Oct 2026`
- `.tr-banner` rules at the end of `assets/css/styles.css`

Keep `training.html` and `join.html` live as a record.
