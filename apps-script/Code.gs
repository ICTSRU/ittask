/**
 * =====================================================================
 *  IT Task List Management · إدارة مهام تقنية المعلومات — v3.3
 *  Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)
 *  Built on: SRU Secure Access Kit v1.4 · Look: SRU Brand Kit (linked from ictsru.github.io/brand)
 * ---------------------------------------------------------------------
 *  Files:  Code.gs · Index.html · Logos.html · Denied.html
 *  Sheet:  «سجل مهام تقنية المعلومات - ICTD Task Register»
 *  Deploy: automatic — push apps-script/** to GitHub (ICTSRU/ittask) ▸ Actions ▸ Deploy Apps Script
 *          (manual fallback: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version)
 *          Execute as: Me  ·  Who has access: Anyone within Sulaiman Al Rajhi University
 *  Access: only active e-mails in sheet "AllowedUsers" (ACCESS_MODE = 'LIST')
 *  Log:    every sign-in → sheet "AccessLog"
 *  First run: select  setup  ▸ Run (creates Tasks/Team/Audit/AllowedUsers tabs)
 * =====================================================================
 */

/* ▼▼▼ CONFIG — Secure Access Kit ▼▼▼ */
const APP_NAME       = 'إدارة مهام تقنية المعلومات';
const APP_NAME_EN    = 'IT Task List Management';
const APP_VERSION    = '3.3';
const ALLOWED_DOMAIN = 'sr.edu.sa';
const FAVICON_URL    = 'https://ictsru.github.io/ITOC/assets/itoc-logo.png';

/* Access log */
const LOG_ENABLED        = true;
const LOG_SPREADSHEET_ID = '';            // '' = this spreadsheet
const SHEET_LOG          = 'AccessLog';
const LOG_TIMEZONE       = 'Asia/Riyadh';
const LOG_DEDUP_MINUTES  = 30;            // same user within N min = one entry (0 = every open)
const LOG_RETENTION_DAYS = 180;
/* Access list */
const ACCESS_MODE           = 'LIST';     // 'LIST' = AllowedUsers only · 'DOMAIN' = any @sr.edu.sa
const ACCESS_SPREADSHEET_ID = '';
const SHEET_ACCESS          = 'AllowedUsers';
const OWNER_EMAILS          = ['m.elmahdy@sr.edu.sa'];   // always allowed
const ACCESS_CACHE_SECONDS  = 120;

/* Default access list — added to AllowedUsers by setupAccessList() (existing rows are kept).
   v3.3: left empty because this file is published in the public GitHub repo (ICTSRU/ittask).
   The real list (e-mail, name, role, active) lives only in the AllowedUsers tab of the Sheet — manage people there.
   Format if ever needed: ['name@sr.edu.sa', 'Name as in TEAM_NAMES', 'admin'|'user', 'notes'] */
const DEFAULT_ALLOWED = [];
/* ▲▲▲ CONFIG — Secure Access Kit ▲▲▲ */

/* ▼▼▼ CONFIG — Task register ▼▼▼ */
const MANAGER_EMAIL = '';                 // receives the daily summary digest ('' = skip)
const TIMEZONE      = 'Asia/Riyadh';
const SHEET_TASKS   = 'Tasks';
const SHEET_TEAM    = 'Team';
const SHEET_AUDIT   = 'Audit';
const TASK_HEADERS = ['TaskID','Title','Description','Sector','Category','Priority','Source','TicketRef',
  'AssignedTo','AssignedBy','StartDate','DueDate','Status','Progress','CompletedDate','Reviewer',
  'ReviewDate','ReviewResult','ReviewNotes','UpdateLog','CreatedAt','UpdatedAt','CreatedBy',
  'CategoryOther','SourceOther',          // v1.9: free text when «أخرى» is selected
  'UpdatedBy'];                           // v3.0: signed-in e-mail of the last editor (set by the server)
const TEAM_HEADERS  = ['MemberID','Name','Role','Sector','Email','Active','Mobile','Extension'];
const AUDIT_HEADERS = ['Timestamp','Action','RecordID','Summary','By'];
const TEAM_NAMES = ['Dr. Nasser Abounar','Mohamed ElMahdy','Mohamed Nawaz','Mohamed Omar','Mohamed Saleh',
  'Ammar Alrowedan','Nayed Alrashidi','Abd Alazez Alawaji','Azzam Alaqeel','Asma Alolayan',
  'Shath Albusyli','Inshrah Almutairi','عاطف النادي','سراج'];
const DATE_FIELDS  = ['StartDate','DueDate','CompletedDate','ReviewDate'];
const OPEN_EXCLUDE = ['completed','cancelled'];
/* ▲▲▲ CONFIG — Task register ▲▲▲ */

const LOG_HEADERS    = ['timestamp', 'date', 'time', 'day', 'email', 'result', 'version'];
const DAYS_AR_       = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ACCESS_HEADERS = ['email', 'name', 'role', 'active', 'notes'];

/* ============================== Web app ============================== */

function doGet() {
  const email = currentEmail_();
  const status = accessStatus_(email);
  if (status !== 'ok') {
    logAccess_(email || '(unknown)', status === 'list' ? 'not-listed' : 'denied');
    const d = HtmlService.createTemplateFromFile('Denied');
    d.appName = APP_NAME; d.appNameEn = APP_NAME_EN;
    d.userEmail = email || '';
    d.reason = status;
    return d.evaluate().setTitle(APP_NAME + ' | غير مصرح')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  logAccess_(email, 'granted');

  const t = HtmlService.createTemplateFromFile('Index');
  t.appName   = APP_NAME;
  t.appNameEn = APP_NAME_EN;
  t.version   = APP_VERSION;
  t.userEmail = email;
  t.dataJson  = safeJson_(getInitialData_(email));   // tasks + team + signed-in user, no extra round trip
  const out = t.evaluate().setTitle(APP_NAME_EN + ' | ' + APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  if (FAVICON_URL) out.setFaviconUrl(FAVICON_URL);
  return out;
}

function getInitialData_(email) {
  return {
    ok: true,
    tasks: readAll_(SHEET_TASKS, TASK_HEADERS),
    team: readAll_(SHEET_TEAM, TEAM_HEADERS),
    me: whoAmI_(email)
  };
}

/* ================ Server calls from the page (google.script.run) ================
 *  EVERY function below starts with requireSruUser_() — the page check alone is not enough. */

function apiList() {
  const email = requireSruUser_();
  return getInitialData_(email);
}

function apiSaveTask(task) {
  const email = requireSruUser_();
  return withLock_(function () {
    const me = whoAmI_(email);
    const t = sanitize_(task, TASK_HEADERS);
    t.UpdatedBy = email;                                 // authoritative: set by the server, not the browser
    return { ok: true, task: saveTask_(t, me) };
  });
}

function apiDeleteTask(id) {
  const email = requireSruUser_();
  return withLock_(function () {
    deleteRow_(SHEET_TASKS, TASK_HEADERS, 'TaskID', String(id || ''));
    audit_('deleteTask', id, '', email);
    return { ok: true };
  });
}

function apiSaveMember(member) {
  const email = requireSruUser_();
  return withLock_(function () {
    return { ok: true, member: saveMember_(sanitize_(member, TEAM_HEADERS), email) };
  });
}

function apiDeleteMember(id) {
  const email = requireSruUser_();
  return withLock_(function () {
    deleteRow_(SHEET_TEAM, TEAM_HEADERS, 'MemberID', String(id || ''));
    audit_('deleteMember', id, '', email);
    return { ok: true };
  });
}

/* ============================ Task logic ============================ */

function saveTask_(t, me) {
  if (!t.Title) throw new Error('عنوان المهمة مطلوب · Title is required');
  const now = stamp_();
  const sh = sheet_(SHEET_TASKS, TASK_HEADERS);
  if (!t.TaskID) t.TaskID = newTaskId_();
  t.UpdatedAt = now;
  const rowIdx = findRow_(sh, TASK_HEADERS.indexOf('TaskID'), t.TaskID);
  if (rowIdx < 0) {
    t.CreatedAt = now;
    t.CreatedBy = me.name;                               // creator = signed-in user
    sh.appendRow(TASK_HEADERS.map(function (h) { return clean_(t[h]); }));
    audit_('createTask', t.TaskID, t.Title, me.email);
  } else {
    const existing = sh.getRange(rowIdx, 1, 1, TASK_HEADERS.length).getValues()[0];
    const merged = TASK_HEADERS.map(function (h, i) {
      if (h === 'CreatedAt' || h === 'CreatedBy') return existing[i] || clean_(t[h]);
      return t.hasOwnProperty(h) ? clean_(t[h]) : existing[i];
    });
    sh.getRange(rowIdx, 1, 1, TASK_HEADERS.length).setValues([merged]);
    audit_('updateTask', t.TaskID, (t.Status || '') + ' · ' + (t.Progress || 0) + '%', me.email);
  }
  return t;
}

function saveMember_(m, email) {
  if (!m.Name) throw new Error('الاسم مطلوب · Name is required');
  const sh = sheet_(SHEET_TEAM, TEAM_HEADERS);
  if (!m.MemberID) {
    const same = readAll_(SHEET_TEAM, TEAM_HEADERS).filter(function (x) { return x.Name === m.Name; })[0];
    m.MemberID = same ? same.MemberID : 'MBR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  }
  const row = TEAM_HEADERS.map(function (h) {
    let v = clean_(m[h]);
    if ((h === 'Mobile' || h === 'Extension') && /^\d+$/.test(v)) v = "'" + v;   // keep leading zeros
    return v;
  });
  const idx = findRow_(sh, 0, m.MemberID);
  if (idx < 0) sh.appendRow(row); else sh.getRange(idx, 1, 1, row.length).setValues([row]);
  audit_('saveMember', m.MemberID, m.Name, email);
  return m;
}

function newTaskId_() {
  // TSK-YYYYMMDD-NNNN (sequence restarts daily)
  const day = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd');
  const prefix = 'TSK-' + day + '-';
  let max = 0;
  readAll_(SHEET_TASKS, TASK_HEADERS).forEach(function (r) {
    if (r.TaskID.indexOf(prefix) === 0) { const n = parseInt(r.TaskID.slice(prefix.length), 10); if (n > max) max = n; }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

/** Display name of the signed-in user: Team sheet (by e-mail) → AllowedUsers name → e-mail. */
function whoAmI_(email) {
  email = String(email || '').toLowerCase();
  let name = '', role = 'user';
  try {
    const m = readAll_(SHEET_TEAM, TEAM_HEADERS).filter(function (x) { return String(x.Email).trim().toLowerCase() === email; })[0];
    if (m) name = m.Name;
  } catch (e) { /* ignore */ }
  try {
    const sh = accessSheet_(false);
    if (sh && sh.getLastRow() > 1) {
      const r = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues()
        .filter(function (x) { return String(x[0]).trim().toLowerCase() === email; })[0];
      if (r) { if (!name && r[1] && r[1] !== 'Owner') name = String(r[1]); if (r[2]) role = String(r[2]); }
    }
  } catch (e) { /* ignore */ }
  if (!name) {
    const d = DEFAULT_ALLOWED.filter(function (x) { return x[0] === email; })[0];
    name = d && d[1] ? d[1] : email;
  }
  if (OWNER_EMAILS.indexOf(email) !== -1) role = 'admin';
  return { email: email, name: name, role: role };
}

/* ============================== Setup =============================== */

/** Run once from the editor: creates/updates all tabs, seeds team names, e-mails and the access list. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TIMEZONE);
  ensureSheet_(ss, SHEET_TASKS, TASK_HEADERS);
  ensureSheet_(ss, SHEET_TEAM, TEAM_HEADERS);
  ensureSheet_(ss, SHEET_AUDIT, AUDIT_HEADERS);

  // Team: add missing official names; fill a blank Email from DEFAULT_ALLOWED (existing values are never overwritten)
  const team = sheet_(SHEET_TEAM, TEAM_HEADERS);
  const existing = readAll_(SHEET_TEAM, TEAM_HEADERS);
  const emailByName = {};
  DEFAULT_ALLOWED.forEach(function (r) { if (r[1]) emailByName[r[1]] = r[0]; });
  TEAM_NAMES.forEach(function (n, i) {
    const row = existing.filter(function (m) { return m.Name === n; })[0];
    if (!row) {
      team.appendRow(['MBR-' + ('00' + (i + 1)).slice(-3), n, '', '', emailByName[n] || '', 'Yes', '', '']);
    } else if (!row.Email && emailByName[n]) {
      const idx = findRow_(team, 0, row.MemberID);
      if (idx > 0) team.getRange(idx, TEAM_HEADERS.indexOf('Email') + 1).setValue(emailByName[n]);
    }
  });

  // Tasks: keep date columns as plain text so they round-trip cleanly
  const sh = ss.getSheetByName(SHEET_TASKS);
  DATE_FIELDS.concat(['CreatedAt', 'UpdatedAt']).forEach(function (f) {
    sh.getRange(2, TASK_HEADERS.indexOf(f) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  sh.setColumnWidth(TASK_HEADERS.indexOf('Title') + 1, 280);
  sh.setColumnWidth(TASK_HEADERS.indexOf('UpdateLog') + 1, 360);

  setupAccessList();
  getLogSheet_();
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
    // upgrade in place: add any new columns at the end of the header row
    headers.forEach(function (h, i) {
      if (String(first[i] || '') === '') {
        sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#501e8c').setFontColor('#ffffff');
      }
    });
  }
  return sh;
}

/* ============================== Access ============================== */

function currentEmail_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}
function isAllowed_(email) {
  return !!email && email.endsWith('@' + ALLOWED_DOMAIN);
}
function requireSruUser_() {
  const email = currentEmail_();
  const status = accessStatus_(email);
  if (status === 'domain') throw new Error('غير مصرح — الدخول لمنسوبي الجامعة فقط');
  if (status === 'list') throw new Error('غير مصرح — حسابك غير مضاف إلى قائمة المصرّح لهم');
  return email;
}

/** 'ok' | 'domain' (not @sr.edu.sa) | 'list' (not on the active list) */
function accessStatus_(email) {
  if (!isAllowed_(email)) return 'domain';
  if (ACCESS_MODE !== 'LIST') return 'ok';
  if (OWNER_EMAILS.map(function (e) { return e.toLowerCase(); }).indexOf(email) !== -1) return 'ok';
  return allowedEmails_().indexOf(email) !== -1 ? 'ok' : 'list';
}

function allowedEmails_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('acl_v1');
  if (hit) return JSON.parse(hit);
  let list = [];
  try {
    const sh = accessSheet_(false);
    if (sh && sh.getLastRow() > 1) {
      list = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
        .filter(function (r) { return r[0] && r[3] !== false && String(r[3]).toUpperCase() !== 'FALSE'; })
        .map(function (r) { return String(r[0]).trim().toLowerCase(); });
    }
  } catch (e) { console.error('allowedEmails_ failed: ' + e); }
  cache.put('acl_v1', JSON.stringify(list), ACCESS_CACHE_SECONDS);
  return list;
}

function accessSheet_(create) {
  const ss = ACCESS_SPREADSHEET_ID ? SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_ACCESS);
  if (!sh && create) {
    sh = ss.insertSheet(SHEET_ACCESS);
    sh.getRange(1, 1, 1, ACCESS_HEADERS.length).setValues([ACCESS_HEADERS])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#501e8c');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    [260, 200, 100, 70, 260].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange(2, 4, 300, 1).insertCheckboxes();
    sh.getRange('A1').setNote('البريد الجامعي كاملًا — name@sr.edu.sa');
    sh.getRange('C1').setNote('admin / user');
    sh.getRange('D1').setNote('ألغِ العلامة لإيقاف الوصول دون حذف الصف');
  }
  return sh;
}

/** Creates the AllowedUsers tab and adds the team list (existing rows and their active state are kept). */
function setupAccessList() {
  const sh = accessSheet_(true);
  const n = Math.max(sh.getLastRow() - 1, 0);
  const data = n ? sh.getRange(2, 1, n, 5).getValues() : [];
  const kept = data.filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return [String(r[0]).trim(), r[1], r[2], r[3] === true || String(r[3]).toUpperCase() === 'TRUE', r[4]]; });
  const have = kept.map(function (r) { return r[0].toLowerCase(); });

  // team list first (so each person keeps their real name), then any owner not already listed
  const seed = DEFAULT_ALLOWED.concat(OWNER_EMAILS.map(function (e) { return [e, 'Owner', 'admin', 'owner']; }));
  let added = 0;
  seed.forEach(function (r) {
    const e = String(r[0]).trim().toLowerCase();
    if (e && have.indexOf(e) === -1) {
      kept.push([e, r[1] || '', r[2] || 'user', true, r[3] || 'added by setupAccessList']);
      have.push(e); added++;
    }
  });

  if (n) sh.getRange(2, 1, n, 5).clearContent();
  const rows = Math.max(n, kept.length, 50);
  sh.getRange(2, 4, rows, 1).insertCheckboxes();
  if (kept.length) sh.getRange(2, 1, kept.length, 5).setValues(kept);

  CacheService.getScriptCache().remove('acl_v1');
  console.log('AllowedUsers ready: ' + kept.length + ' entries (' + added + ' added).');
  try { SpreadsheetApp.getActive().toast('قائمة المصرّح لهم جاهزة: ' + kept.length + ' بريدًا (أُضيف ' + added + ').', SHEET_ACCESS, 8); } catch (e) {}
}

/* ============================ Access log ============================ */

function logAccess_(email, result) {
  if (!LOG_ENABLED) return;
  try {
    if (LOG_DEDUP_MINUTES > 0 && result === 'granted') {
      const cache = CacheService.getScriptCache();
      const key = 'log_' + email;
      if (cache.get(key)) return;
      cache.put(key, '1', LOG_DEDUP_MINUTES * 60);
    }
    const now = new Date();
    const f = function (p) { return Utilities.formatDate(now, LOG_TIMEZONE, p); };
    getLogSheet_().appendRow([now, f('yyyy-MM-dd'), f('HH:mm:ss'), DAYS_AR_[Number(f('u')) % 7],
      email, result === 'granted' ? 'دخول' : (result === 'not-listed' ? 'غير مدرج' : 'مرفوض'), APP_VERSION]);
  } catch (e) {
    console.error('logAccess_ failed: ' + e);
  }
}

function getLogSheet_() {
  const ss = LOG_SPREADSHEET_ID ? SpreadsheetApp.openById(LOG_SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: bind the script to a Sheet or set LOG_SPREADSHEET_ID');
  let sh = ss.getSheetByName(SHEET_LOG);
  if (!sh) {
    sh = ss.insertSheet(SHEET_LOG);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#3a1464');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    [170, 100, 80, 80, 260, 80, 70].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

function showLogSummary() {
  const sh = getLogSheet_();
  const ui = SpreadsheetApp.getUi();
  const last = sh.getLastRow();
  if (last < 2) { ui.alert('سجل الدخول', 'لا توجد سجلات بعد.', ui.ButtonSet.OK); return; }
  const since = new Date(Date.now() - 30 * 864e5);
  const rows = sh.getRange(2, 1, last - 1, LOG_HEADERS.length).getValues()
    .filter(function (r) { return r[0] instanceof Date && r[0] >= since && r[5] === 'دخول'; });
  const users = {};
  rows.forEach(function (r) { users[r[4]] = (users[r[4]] || 0) + 1; });
  const top = Object.keys(users).sort(function (a, b) { return users[b] - users[a]; }).slice(0, 10)
    .map(function (u, i) { return (i + 1) + '. ' + u + ' — ' + users[u]; }).join('\n');
  ui.alert('سجل الدخول — آخر 30 يومًا — ' + APP_NAME,
    'عدد الزيارات: ' + rows.length + '\nعدد المستخدمين: ' + Object.keys(users).length + '\n\nالأكثر دخولًا:\n' + (top || '—'),
    ui.ButtonSet.OK);
}

function purgeOldLogs() {
  const sh = getLogSheet_();
  const last = sh.getLastRow();
  let removed = 0;
  if (last > 1) {
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 864e5);
    const stamps = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = stamps.length - 1; i >= 0; i--) {
      if (stamps[i][0] instanceof Date && stamps[i][0] < cutoff) { sh.deleteRow(i + 2); removed++; }
    }
  }
  SpreadsheetApp.getActive().toast('حُذف ' + removed + ' سجل أقدم من ' + LOG_RETENTION_DAYS + ' يومًا.', APP_NAME_EN, 6);
}

/** One sheet menu for the whole project (kit items + task-register items). */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu(APP_NAME_EN)
      .addItem('إعداد الجداول والفريق والصلاحيات (setup)', 'setup')
      .addItem('إعداد قائمة المصرّح لهم (AllowedUsers)', 'setupAccessList')
      .addSeparator()
      .addItem('ملخص سجل الدخول (30 يومًا)', 'showLogSummary')
      .addItem('حذف سجلات الدخول القديمة', 'purgeOldLogs')
      .addSeparator()
      .addItem('تفعيل التذكير اليومي بالمهام (07:00)', 'installDailyReminder')
      .addItem('عرض رابط المنصة', 'showWebAppUrl')
      .addToUi();
  } catch (e) { /* standalone: no sheet UI */ }
}

function showWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('رابط ' + APP_NAME, ScriptApp.getService().getUrl() || 'لم يُنشر بعد: Deploy ▸ New deployment ▸ Web app', ui.ButtonSet.OK);
}

/* ===================== Daily reminder (automation) ===================== */

/** Run once: e-mails overdue / due-in-3-days digests every working day at 07:00 Riyadh time. */
function installDailyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'sendDailyDigest') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('sendDailyDigest').timeBased().everyDays(1).atHour(7).inTimezone(TIMEZONE).create();
  try { SpreadsheetApp.getActive().toast('تم تفعيل التذكير اليومي (07:00)', APP_NAME_EN, 6); } catch (e) {}
  return 'Daily reminder installed (07:00 ' + TIMEZONE + ')';
}

function sendDailyDigest() {
  const dow = Number(Utilities.formatDate(new Date(), TIMEZONE, 'u')); // 1=Mon … 7=Sun
  if (dow === 5 || dow === 6) return;                                   // skip Fri/Sat
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const soon = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), TIMEZONE, 'yyyy-MM-dd');
  const all = readAll_(SHEET_TASKS, TASK_HEADERS);
  const tasks = all.filter(function (t) { return OPEN_EXCLUDE.indexOf(t.Status) < 0 && t.DueDate; });
  const appUrl = ScriptApp.getService().getUrl() || '';

  readAll_(SHEET_TEAM, TEAM_HEADERS).forEach(function (m) {
    if (!m.Email || m.Active === 'No') return;
    const mine = tasks.filter(function (t) { return t.AssignedTo === m.Name; });
    const overdue = mine.filter(function (t) { return t.DueDate < today; });
    const dueSoon = mine.filter(function (t) { return t.DueDate >= today && t.DueDate <= soon; });
    if (!overdue.length && !dueSoon.length) return;
    MailApp.sendEmail({
      to: m.Email,
      subject: 'تذكير المهام · Task reminder — ' + overdue.length + ' متأخرة / ' + dueSoon.length + ' قريبة الاستحقاق',
      htmlBody: digestHtml_(m.Name, overdue, dueSoon, appUrl)
    });
  });

  if (MANAGER_EMAIL) {
    const s = stats_(all);
    MailApp.sendEmail({
      to: MANAGER_EMAIL,
      subject: 'ملخص المهام اليومي · Daily task summary — ' + today,
      htmlBody: '<div dir="rtl" style="font-family:Tahoma,Arial">' +
        '<h3 style="color:#501e8c">ملخص المهام اليومي</h3>' +
        '<p>الإجمالي: <b>' + s.total + '</b> · المفتوحة: <b>' + s.open + '</b> · المتأخرة: <b style="color:#b42318">' + s.overdue +
        '</b> · بانتظار المراجعة: <b>' + s.review + '</b> · نسبة الإنجاز: <b>' + s.progress + '%</b> · نسبة الإكمال: <b>' + s.rate + '%</b></p>' +
        table_(tasks.filter(function (t) { return t.DueDate < today; }), 'المهام المتأخرة') +
        (appUrl ? '<p><a href="' + appUrl + '">فتح نظام إدارة المهام</a></p>' : '') + '</div>'
    });
  }
}

function digestHtml_(name, overdue, dueSoon, appUrl) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial">' +
    '<p>مرحباً ' + esc_(name) + '،</p><p>هذا ملخص مهامك المفتوحة التي تحتاج متابعة:</p>' +
    table_(overdue, 'مهام متأخرة') + table_(dueSoon, 'مستحقة خلال 3 أيام') +
    (appUrl ? '<p><a href="' + appUrl + '">فتح نظام إدارة المهام</a> (بحساب الجامعة)</p>' : '') +
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

/** Same definitions as the app: progress = average Progress (completed = 100), rate = completed ÷ total. */
function stats_(tasks) {
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const s = { total: tasks.length, open: 0, overdue: 0, review: 0, completed: 0, cancelled: 0 };
  let progSum = 0, progN = 0;
  tasks.forEach(function (t) {
    const open = OPEN_EXCLUDE.indexOf(t.Status) < 0;
    if (open) s.open++;
    if (open && t.DueDate && t.DueDate < today) s.overdue++;
    if (t.Status === 'under_review') s.review++;
    if (t.Status === 'completed') s.completed++;
    if (t.Status === 'cancelled') s.cancelled++;
    if (t.Status !== 'cancelled') { progSum += t.Status === 'completed' ? 100 : (Number(t.Progress) || 0); progN++; }
  });
  const base = s.total - s.cancelled;
  s.rate = base ? Math.round(s.completed / base * 100) : 0;
  s.progress = progN ? Math.round(progSum / progN) : 0;
  return s;
}

/* =========================== Sheet helpers =========================== */

function sheet_(name, headers) {
  return ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), name, headers);
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
  if (idx < 0) throw new Error('السجل غير موجود · Record not found: ' + id);
  sh.deleteRow(idx);
}

function audit_(action, id, summary, by) {
  try { sheet_(SHEET_AUDIT, AUDIT_HEADERS).appendRow([stamp_(), action, id, summary, by || '']); } catch (e) { /* non-blocking */ }
}

/** Keep only known fields, as strings. */
function sanitize_(obj, headers) {
  const o = {};
  obj = obj || {};
  headers.forEach(function (h) { if (Object.prototype.hasOwnProperty.call(obj, h)) o[h] = obj[h] == null ? '' : String(obj[h]); });
  return o;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Prevent spreadsheet formula injection from user input
function clean_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 50000);
}

function stamp_() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm'); }
function esc_(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function safeJson_(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
