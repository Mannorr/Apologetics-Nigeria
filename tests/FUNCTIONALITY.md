# What the site must keep doing

`tests/check.py verify` checks all of this automatically against `tests/baseline.json`
(recorded from `main` on 22 Sep 2026). Run it before merging any page conversion.

## Every page
- Title, meta description, canonical, Open Graph + Twitter tags, JSON-LD: unchanged
- Every link that existed still exists; every internal link returns 200
- Every `#anchor` someone links to (e.g. `partner#give`, `training#register`) still exists
- No JavaScript errors, no missing assets
- Mobile menu opens and shows all site links
- Legacy URLs in `vercel.json` still resolve (printed in old emails/PDFs)

## Forms (Formspree is intercepted during tests — nothing is really sent)
| Page | Form | Endpoint | On success |
|---|---|---|---|
| index | `#newsForm` | `f/mkolkrqb` | inline message |
| contact | `#contactForm` | `f/mkolkrqb` | inline message |
| training | `#trainingForm` | `f/xqpkbrwp` | redirect to `registered` (+ `_next` fallback) |
| vol | `#volForm` | `f/mzezbggj` | "join the group" panel; needs ≥1 role ticked |

For each: same field names, types, required flags, select options and hidden values;
exactly one POST; error message and re-enabled button when Formspree fails.

## Resources
- Topic filter tabs (All, Islam, Atheism, Jesus, The Bible, Foundations)
- All 20 decks open, page forward/back with arrows, close with Escape, swipe on touch
- `resources#deck-01` … opens that deck directly (used by the homepage)
- Video thumbnails load the player on click

## Must never break
- `join.html` — exactly one Google Meet link (see README)
- `assets/files/defending-the-faith.ics` — valid calendar file
- `assets/files/defending-the-faith-attendee-pack.pdf` — the attendee pack linked from `registered`
- `assets/files/apologetics-nigeria-profile.pdf` — the ministry profile linked from the homepage

## Fixed during the v2 rebuild (baseline updated on purpose)
- Mobile menu on every page except home showed only one link (72px panel). Fixed.
- `resources.html` ran its own duplicate copy of the menu, filter, deck and video code.
  All of it now lives once in `assets/js/v2.js`; videos use youtube-nocookie everywhere.
- `resources.html` twitter:image pointed at `https://assets/img/...` (broken). Fixed.
- Training and volunteer H1s read "Defendingthe Faith." / "Call forvolunteers." to
  screen readers and search engines (a `<br>` with no space). Fixed.

## Baseline updated on purpose, 2 Oct 2026
- Nav and footer "Training" became "Events" (`/events`). `/training` is unchanged and
  still linked from the homepage ticket, `registered`, and the Defending the Faith card.
- New page `events.html` added to the baseline.

## Baseline updated on purpose, 3 Oct 2026
- New page `opened-veil.html` (Opened Veil 2027) added, with `#veilForm` posting to
  `f/mgavgvaz` and an inline confirmation (`data-success-text`).
- The January 2027 placeholder card on `events` now links to `/opened-veil`.
- Same day: `opened-veil` restyled in the event's own identity (`assets/css/opened-veil.css`,
  Cinzel + Michroma self-hosted). Share image is now the 16:9 flyer; H1 reads "Opened Veil".
- Same day: Opened Veil registration now takes a commitment fee (from ₦3,000). `#veilForm`
  logic lives in `assets/js/opened-veil.js`: details go to Formspree first, then a short
  "registered, taking you to payment" message, then Stripe (one payment link per amount,
  plus a custom-amount link with a ₦3,000 minimum) or Flutterwave. Both return to
  `opened-veil-confirmed.html` (noindex), which records the return on Formspree.
  The page header is now the supplied banner image.
