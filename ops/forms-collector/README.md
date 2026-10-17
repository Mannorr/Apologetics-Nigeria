# Form collector (Phase 1, replaces Formspree)

## Form inventory (17 Oct 2026)

| Form | Page | Purpose | Required fields | Endpoint today | After submit | Payment |
|---|---|---|---|---|---|---|
| `#trainingForm` | training.html | Defending the Faith registration (free) | name, email, whatsapp, location, organisation, role, question | formspree `xqpkbrwp` | redirect to /registered | none |
| `#veilForm` | opened-veil.html | Opened Veil 2027 registration | name, email, whatsapp, location, role; fee from ₦3,000 | formspree `mgavgvaz` | save, then redirect to Stripe link or Flutterwave page | same flow: submit, then pay (ref `OV27-XXXXXX` sent to Stripe as client_reference_id) |
| (no form) payment return | opened-veil-confirmed.html | logs the return from Stripe/Flutterwave | n/a | formspree `mgavgvaz` (fetch in opened-veil.js) | silent | records the return only; NOT proof of payment |
| `#contactForm` | contact.html | enquiries | name, email, message | formspree `mkolkrqb` | inline thank-you | none |
| `#newsForm` | index.html | newsletter | email | formspree `mkolkrqb` | inline thank-you | none |
| `#volForm` | vol.html | volunteer application | name, email, whatsapp, location, experience, portfolio, about, why, 1+ role | formspree `mzezbggj` | shows WhatsApp step | none |

All submissions go through `window.anSaveForm` in assets/js/v2.js (Opened Veil via assets/js/opened-veil.js).
Each POST adds `_form` (form id), `_page` (URL), `_js=1`, and a `_gotcha` spam trap.

## Deploy the collector (about 10 minutes, needs the ministry Google account)

1. Create a Google Sheet named "Apologetics Nigeria forms".
2. Extensions > Apps Script. Delete the sample code, paste `Code.gs` from this folder. Save.
3. Check `CONFIG.NOTIFY_TO` (default info.apologeticsnigeria@gmail.com).
4. Deploy > New deployment > type: Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy, approve the permissions.
5. Copy the Web app URL (ends in `/exec`). Open it in a browser: it should show `{"ok":true,"service":"an-forms"}`.
6. Send the URL to the web team to switch the forms.

## Limits to know

- Email: a free Gmail account can send about 100 emails a day from Apps Script. Past that, rows are still saved but emails stop until the next day.
- Apps Script handles roughly 30 submissions at the same moment. Fine for our volume.
