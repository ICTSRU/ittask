/**
 * IT Task List Management — Google Apps Script backend
 * Version: v2.0
 * Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)
 *
 * Setup (see README.md for screenshots-free step list):
 *  1. Create a Google Sheet → Extensions → Apps Script → paste this file.
 *  2. Run setup() once (authorise when prompted).
 *  3. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone
 *     (or "Anyone within sr.edu.sa" if every user is signed in to Google Workspace).
 *  4. Copy the /exec URL into index.html (CONFIG.API_URL) or the app's Settings tab.
 *  5. Optional: run installDailyReminder() to email overdue / due-soon digests every morning.
 */

// ===== Configuration =====
const API_KEY = '';                      // optional shared key; must match CONFIG.API_KEY / Settings in the app
const MANAGER_EMAIL = '';                // receives the daily summary digest (leave empty to skip)
const TIMEZONE = 'Asia/Riyadh';
const SHEET_TASKS = 'Tasks';
const SHEET_TEAM = 'Team';
const SHEET_AUDIT = 'Audit';

const TASK_HEADERS = ['TaskID','Title','Description','Sector','Category','Priority','Source','TicketRef',
  'AssignedTo','AssignedBy','StartDate','DueDate','Status','Progress','CompletedDate','Reviewer',
  'ReviewDate','ReviewResult','ReviewNotes','UpdateLog','CreatedAt','UpdatedAt','CreatedBy',
  'CategoryOther','SourceOther'];  // v2.0: free-text when «أخرى» is selected
const TEAM_HEADERS = ['MemberID','Name','Role','Sector','Email','Active','Mobile','Extension'];
const AUDIT_HEADERS = ['Timestamp','Action','RecordID','Summary'];
// Official ICTD names list — seeded into the Team sheet by setup() (add role & email there or in the app)
const TEAM_NAMES = ['Dr. Nasser Abounar','Mohamed ElMahdy','Mohamed Nawaz','Mohamed Omar','Mohamed Saleh',
  'Ammar Alrowedan','Nayed Alrashidi','Abd Alazez Alawaji','Azzam Alaqeel','Asma Alolayan',
  'Shath Albusyli','Inshrah Almutairi','عاطف النادي','سراج'];
const DATE_FIELDS = ['StartDate','DueDate','CompletedDate','ReviewDate'];
const OPEN_EXCLUDE = ['completed','cancelled'];

// ===== One-time setup =====
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_TASKS, TASK_HEADERS);
  ensureSheet_(ss, SHEET_TEAM, TEAM_HEADERS);
  ensureSheet_(ss, SHEET_AUDIT, AUDIT_HEADERS);
  ss.setSpreadsheetTimeZone(TIMEZONE);
  // seed the official names into Team (only names not already there)
  const existing = readAll_(SHEET_TEAM, TEAM_HEADERS).map(function (m) { return m.Name; });
  TEAM_NAMES.forEach(function (n, i) {
    if (existing.indexOf(n) < 0) sheet_(SHEET_TEAM, TEAM_HEADERS).appendRow(['MBR-' + ('00' + (i + 1)).slice(-3), n, '', '', '', 'Yes', '', '']);
  });
  // keep date columns as plain text (yyyy-mm-dd) so they round-trip cleanly
  const sh = ss.getSheetByName(SHEET_TASKS);
  DATE_FIELDS.concat(['CreatedAt','UpdatedAt']).forEach(function (f) {
    sh.getRange(2, TASK_HEADERS.indexOf(f) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  sh.setColumnWidth(TASK_HEADERS.indexOf('Title') + 1, 280);
  sh.setColumnWidth(TASK_HEADERS.indexOf('UpdateLog') + 1, 360);
  return 'Setup complete';
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (first.join('') === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#501e8c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else {
    // upgrade: add any new columns (e.g. Mobile, Extension in v2.0) at the end of the header row
    headers.forEach(function (h, i) {
      if (String(first[i] || '') === '') {
        sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#501e8c').setFontColor('#ffffff');
      }
    });
  }
  return sh;
}

// ===== HTTP entry points =====
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    checkKey_(p.key);
    const action = p.action || 'list';
    if (action === 'ping') return json_({ ok: true, version: 'v2.0', time: new Date().toISOString() });
    if (action === 'list') return json_({ ok: true, tasks: readAll_(SHEET_TASKS, TASK_HEADERS), team: readAll_(SHEET_TEAM, TEAM_HEADERS) });
    if (action === 'get') {
      const t = readAll_(SHEET_TASKS, TASK_HEADERS).filter(function (r) { return r.TaskID === p.id; })[0];
      return json_(t ? { ok: true, task: t } : { ok: false, error: 'Not found' });
    }
    if (action === 'stats') return json_({ ok: true, stats: stats_(readAll_(SHEET_TASKS, TASK_HEADERS)) });
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkKey_(body.key);
    switch (body.action) {
      case 'saveTask':     return json_({ ok: true, task: saveTask_(body.task || {}) });
      case 'deleteTask':   deleteRow_(SHEET_TASKS, TASK_HEADERS, 'TaskID', body.id); audit_('deleteTask', body.id, ''); return json_({ ok: true });
      case 'saveMember':   return json_({ ok: true, member: saveMember_(body.member || {}) });
      case 'deleteMember': deleteRow_(SHEET_TEAM, TEAM_HEADERS, 'MemberID', body.id); audit_('deleteMember', body.id, ''); return json_({ ok: true });
      default:             return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ===== Core logic =====
function saveTask_(t) {
  if (!t.Title) throw new Error('Title is required');
  const now = stamp_();
  const sh = sheet_(SHEET_TASKS, TASK_HEADERS);
  const isNew = !t.TaskID;
  if (isNew) t.TaskID = newTaskId_();
  t.UpdatedAt = now;
  const rowIdx = findRow_(sh, TASK_HEADERS.indexOf('TaskID'), t.TaskID);
  if (rowIdx < 0) {
    t.CreatedAt = t.CreatedAt || now;
    sh.appendRow(TASK_HEADERS.map(function (h) { return clean_(t[h]); }));
    audit_('createTask', t.TaskID, t.Title);
  } else {
    const existing = sh.getRange(rowIdx, 1, 1, TASK_HEADERS.length).getValues()[0];
    const merged = TASK_HEADERS.map(function (h, i) {
      if (h === 'CreatedAt' || h === 'CreatedBy') return existing[i] || clean_(t[h]);
      return t.hasOwnProperty(h) ? clean_(t[h]) : existing[i];
    });
    sh.getRange(rowIdx, 1, 1, TASK_HEADERS.length).setValues([merged]);
    audit_('updateTask', t.TaskID, (t.Status || '') + ' · ' + (t.Progress || 0) + '%');
  }
  return t;
}

function saveMember_(m) {
  if (!m.Name) throw new Error('Name is required');
  const sh = sheet_(SHEET_TEAM, TEAM_HEADERS);
  if (!m.MemberID) {
    const same = readAll_(SHEET_TEAM, TEAM_HEADERS).filter(function (x) { return x.Name === m.Name; })[0];
    m.MemberID = same ? same.MemberID : 'MBR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  }
  const row = TEAM_HEADERS.map(function (h) {
    let v = clean_(m[h]);
    if ((h === 'Mobile' || h === 'Extension') && /^\d+$/.test(v)) v = "'" + v;   // keep leading zeros as text
    return v;
  });
  const idx = findRow_(sh, 0, m.MemberID);
  if (idx < 0) sh.appendRow(row); else sh.getRange(idx, 1, 1, row.length).setValues([row]);
  audit_('saveMember', m.MemberID, m.Name);
  return m;
}

function newTaskId_() {
  // TSK-YYYYMMDD-NNNN (sequence restarts daily)
  const day = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd');
  const prefix = 'TSK-' + day + '-';
  const ids = readAll_(SHEET_TASKS, TASK_HEADERS).map(function (r) { return r.TaskID; })
    .filter(function (id) { return id.indexOf(prefix) === 0; });
  let max = 0;
  ids.forEach(function (id) { const n = parseInt(id.slice(prefix.length), 10); if (n > max) max = n; });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ===== Daily reminder (automation) =====
/** Run once to email overdue / due-in-3-days digests every working day at 07:00 Riyadh time. */
function installDailyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'sendDailyDigest') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('sendDailyDigest').timeBased().everyDays(1).atHour(7).inTimezone(TIMEZONE).create();
  return 'Daily reminder installed (07:00 ' + TIMEZONE + ')';
}

function sendDailyDigest() {
  const dow = Number(Utilities.formatDate(new Date(), TIMEZONE, 'u')); // 1=Mon … 7=Sun
  if (dow === 5 || dow === 6) return;                                   // skip Fri/Sat (Saudi weekend)
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const soon = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), TIMEZONE, 'yyyy-MM-dd');
  const tasks = readAll_(SHEET_TASKS, TASK_HEADERS).filter(function (t) { return OPEN_EXCLUDE.indexOf(t.Status) < 0 && t.DueDate; });
  const team = readAll_(SHEET_TEAM, TEAM_HEADERS);

  team.forEach(function (m) {
    if (!m.Email || m.Active === 'No') return;
    const mine = tasks.filter(function (t) { return t.AssignedTo === m.Name; });
    const overdue = mine.filter(function (t) { return t.DueDate < today; });
    const dueSoon = mine.filter(function (t) { return t.DueDate >= today && t.DueDate <= soon; });
    if (!overdue.length && !dueSoon.length) return;
    MailApp.sendEmail({
      to: m.Email,
      subject: 'تذكير المهام · Task reminder — ' + overdue.length + ' متأخرة / ' + dueSoon.length + ' قريبة الاستحقاق',
      htmlBody: digestHtml_(m.Name, overdue, dueSoon)
    });
  });

  if (MANAGER_EMAIL) {
    const s = stats_(readAll_(SHEET_TASKS, TASK_HEADERS));
    const overdueAll = tasks.filter(function (t) { return t.DueDate < today; });
    MailApp.sendEmail({
      to: MANAGER_EMAIL,
      subject: 'ملخص المهام اليومي · Daily task summary — ' + today,
      htmlBody: '<div dir="rtl" style="font-family:Tahoma,Arial">' +
        '<h3 style="color:#501e8c">ملخص المهام اليومي</h3>' +
        '<p>الإجمالي: <b>' + s.total + '</b> · المفتوحة: <b>' + s.open + '</b> · المتأخرة: <b style="color:#b42318">' + s.overdue +
        '</b> · بانتظار المراجعة: <b>' + s.review + '</b> · نسبة الإنجاز: <b>' + s.rate + '%</b></p>' +
        table_(overdueAll, 'المهام المتأخرة') + '</div>'
    });
  }
}

function digestHtml_(name, overdue, dueSoon) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial">' +
    '<p>مرحباً ' + esc_(name) + '،</p><p>هذا ملخص مهامك المفتوحة التي تحتاج متابعة:</p>' +
    table_(overdue, 'مهام متأخرة') + table_(dueSoon, 'مستحقة خلال 3 أيام') +
    '<p style="color:#6b5a80;font-size:12px">رسالة آلية من نظام إدارة مهام تقنية المعلومات — ITOC</p></div>';
}

function table_(rows, title) {
  if (!rows.length) return '';
  return '<h4 style="color:#3a1464">' + title + ' (' + rows.length + ')</h4>' +
    '<table cellpadding="6" style="border-collapse:collapse;font-size:13px">' +
    '<tr style="background:#f0ebf8"><th>الرقم</th><th>المهمة</th><th>المُسند إليه</th><th>الاستحقاق</th><th>الإنجاز</th></tr>' +
    rows.map(function (t) {
      return '<tr><td>' + esc_(t.TaskID) + '</td><td>' + esc_(t.Title) + '</td><td>' + esc_(t.AssignedTo) +
        '</td><td>' + esc_(t.DueDate) + '</td><td>' + esc_(t.Progress) + '%</td></tr>';
    }).join('') + '</table>';
}

function stats_(tasks) {
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const s = { total: tasks.length, open: 0, overdue: 0, review: 0, completed: 0, cancelled: 0 };
  tasks.forEach(function (t) {
    const open = OPEN_EXCLUDE.indexOf(t.Status) < 0;
    if (open) s.open++;
    if (open && t.DueDate && t.DueDate < today) s.overdue++;
    if (t.Status === 'under_review') s.review++;
    if (t.Status === 'completed') s.completed++;
    if (t.Status === 'cancelled') s.cancelled++;
  });
  const base = s.total - s.cancelled;
  s.rate = base ? Math.round(s.completed / base * 100) : 0;
  return s;
}

// ===== Sheet helpers =====
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ensureSheet_(ss, name, headers);
}

function readAll_(name, headers) {
  const sh = sheet_(name, headers);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.filter(function (r) { return String(r[0]).trim() !== ''; }).map(function (r) {
    const o = {};
    headers.forEach(function (h, i) {
      let v = r[i];
      if (v instanceof Date) v = Utilities.formatDate(v, TIMEZONE, DATE_FIELDS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
      o[h] = v === null || v === undefined ? '' : String(v);
    });
    return o;
  });
}

function findRow_(sh, colIdx, id) {
  const last = sh.getLastRow();
  if (last < 2 || !id) return -1;
  const ids = sh.getRange(2, colIdx + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function deleteRow_(name, headers, key, id) {
  const sh = sheet_(name, headers);
  const idx = findRow_(sh, headers.indexOf(key), id);
  if (idx < 0) throw new Error('Record not found: ' + id);
  sh.deleteRow(idx);
}

function audit_(action, id, summary) {
  try { sheet_(SHEET_AUDIT, AUDIT_HEADERS).appendRow([stamp_(), action, id, summary]); } catch (e) { /* non-blocking */ }
}

// Prevent spreadsheet formula injection from user input
function clean_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 50000);
}

function checkKey_(key) { if (API_KEY && key !== API_KEY) throw new Error('Unauthorized'); }
function stamp_() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm'); }
function esc_(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
