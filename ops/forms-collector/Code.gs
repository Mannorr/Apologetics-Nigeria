/**
 * Apologetics Nigeria form collector (Phase 1 stopgap, replaces Formspree).
 *
 * Bound to a Google Sheet. Every site form POSTs here. Each submission:
 *   1. is written to the Sheet, one tab per form, with a submission id, timestamp and page URL
 *   2. triggers an email notification
 *   3. returns {ok:true,id} so the site only moves on (or sends people to pay) once the row is saved
 *
 * Deploy: Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * Health check: open the /exec URL in a browser. It should say {"ok":true,"service":"an-forms"}.
 */

var CONFIG = {
  NOTIFY_TO: 'info.apologeticsnigeria@gmail.com', // who gets the email on every submission (comma-separate for more)
  MAX_VALUE: 5000,   // characters kept per field
  MAX_FIELDS: 60,    // fields kept per submission
  EMAIL_FLOOR: 3     // stop emailing when fewer than this many sends remain today (rows are still saved)
};

// form id on the site -> tab name in the Sheet
var TABS = {
  trainingForm: 'Training registrations',
  veilForm: 'Opened Veil registrations',
  veilReturn: 'Opened Veil payment returns',
  contactForm: 'Contact',
  newsForm: 'Newsletter',
  volForm: 'Volunteers'
};

// fields that steer the collector and are not stored as columns
var META = { _form: 1, _page: 1, _js: 1, _next: 1, _gotcha: 1, _subject: 1 };

function doGet() {
  return json_({ ok: true, service: 'an-forms' });
}

function doPost(e) {
  var data = flatten_(e);
  if (data._gotcha) return respond_(data, { ok: true, id: 'ignored' }); // honeypot filled: a bot. Pretend success, store nothing.

  var formKey = String(data._form || 'unknown').slice(0, 40);
  var tabName = TABS[formKey] || ('Other ' + formKey).slice(0, 90);
  var id = Utilities.getUuid();
  var row = { submission_id: id, received_at: new Date(), form: formKey, page_url: String(data._page || '').slice(0, 500) };
  Object.keys(data).forEach(function (k) { if (!META[k]) row[k] = data[k]; });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    append_(sheet_(tabName), row);
    SpreadsheetApp.flush();
  } catch (err) {
    console.error('save failed', err);
    return respond_(data, { ok: false, error: 'save_failed' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }

  try { notify_(tabName, row, data); } catch (err) { console.error('email failed', err); } // never fail a saved row because of email
  return respond_(data, { ok: true, id: id });
}

/* ── helpers ─────────────────────────────────────────────── */

// e.parameters holds arrays (checkbox groups send several values). Join them; trim; cap size.
function flatten_(e) {
  var out = {}, src = (e && e.parameters) || {}, n = 0;
  Object.keys(src).forEach(function (k) {
    if (n++ >= CONFIG.MAX_FIELDS) return;
    var key = String(k).slice(0, 60);
    out[key] = [].concat(src[k]).map(String).join(', ').trim().slice(0, CONFIG.MAX_VALUE);
  });
  return out;
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(['submission_id', 'received_at', 'form', 'page_url']); sh.setFrozenRows(1); }
  return sh;
}

// Adds a column for any new field, then writes the row in header order.
function append_(sh, row) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].filter(String);
  Object.keys(row).forEach(function (k) {
    if (headers.indexOf(k) === -1) { headers.push(k); sh.getRange(1, headers.length).setValue(k); }
  });
  sh.appendRow(headers.map(function (h) { return safe_(row[h]); }));
}

// Stop text such as "=IMPORTXML(...)" being run as a formula in the Sheet.
function safe_(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v;
  v = String(v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function notify_(tabName, row, data) {
  if (!CONFIG.NOTIFY_TO || MailApp.getRemainingDailyQuota() < CONFIG.EMAIL_FLOOR) return;
  var who = row.name || row.email || '';
  var lines = Object.keys(row).map(function (k) { return k + ': ' + (row[k] instanceof Date ? row[k].toISOString() : row[k]); });
  var opts = { to: CONFIG.NOTIFY_TO, subject: '[' + tabName + '] ' + who, body: lines.join('\n') + '\n\nSheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl() };
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email || '')) opts.replyTo = row.email;
  MailApp.sendEmail(opts);
}

// JavaScript submissions (_js=1) get JSON. A plain form post (JavaScript off) gets a short page with a link onward.
function respond_(data, result) {
  if (data._js === '1') return json_(result);
  var next = /^https:\/\/(www\.)?apologeticsnigeria\.(com|org)\//.test(data._next || '') ? data._next
           : /^https:\/\/(www\.)?apologeticsnigeria\.(com|org)\//.test(data._page || '') ? data._page : 'https://apologeticsnigeria.com/';
  var msg = result.ok ? 'Thank you. We have received your details.' : 'Something went wrong saving your details. Please go back and try again.';
  var html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top">' +
    '<body style="font-family:Georgia,serif;background:#111;color:#f6f2e9;padding:3rem 1.4rem;max-width:560px;margin:auto;line-height:1.6">' +
    '<p>' + msg + '</p><p><a style="color:#f6f2e9" href="' + next + '">Continue to apologeticsnigeria.com</a></p></body>';
  return HtmlService.createHtmlOutput(html).setTitle('Apologetics Nigeria');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
