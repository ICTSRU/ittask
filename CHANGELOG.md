# CHANGELOG — IT Task List Management

All notable changes to this project are recorded here. Versions use one digit after the decimal point (… v1.8, v1.9, v2.0).

## [v3.3] — 2026-11-03
### Added
- **Automatic Apps Script update from GitHub** (same mechanism as the SOP platform): `.github/workflows/deploy-apps-script.yml` (clasp 2.4.2) pushes `apps-script/` to the project bound to the Task Register Sheet and moves the existing web-app deployment to a new version on every change — same /exec URL. Guide: `AUTODEPLOY.md`.
- Server files now live in the repo under `apps-script/` (`Code.gs`, `Index.html`, `Logos.html`, `Denied.html`).
- The workflow defaults to this platform's live deployment ID, so only two secrets are needed: `CLASPRC_JSON`, `SCRIPT_ID`.
### Changed
- Repository layout matches the platform repo: sign-in page at the root (`index.html`, `assets/`), server code in `apps-script/`.
- `DEFAULT_ALLOWED` in `Code.gs` is empty (the repo is public); the access list lives only in the `AllowedUsers` tab.
- README: automatic update section; older manual update steps kept for reference.

## [v3.2] — 2026-10-24
### Changed
- **GitHub sign-in page (`github-landing/index.html`)** now matches the ICTD Daily Check Report sign-in page exactly: Secure Access Kit layout (logo band, purple→blue line, centred card, plain purple footer with ITOC credit and version).
- Title «الدخول إلى نظام إدارة المهام» and subtitle «IT Task List Management — متاح لفريق الإدارة التنفيذية للاتصالات وتقنية المعلومات فقط», same pattern as the Daily Check Report.
### Not changed
- Apps Script files (`Code.gs`, `Index`, `Denied`, `Logos`) are identical to v3.1 — no redeploy needed. The platform itself keeps the SRU Brand Kit look.

## [v3.1] — 2026-10-24
Applies the **SRU Brand Kit** (`ictsru.github.io/brand`, live v1.1). All three pages now **link** to the shared Brand files, so a later Brand update reaches this platform without a code change.
### Changed
- **App (`Index.html`):** white brand bar `.sru-brandbar` with 40 px SRU (right) / ICTD (left) logos; purple header band uses the **SRU Tech Background · Network** (`.sru-tech-bg`); new footer `.sru-footer .sru-tech-bg-dark` with the «For Support» box (Dial * or servicedesk@sr.edu.sa), copyright/version note and the 32 px ITOC badge linked to the ITOC forms hub.
- **Access-denied page (`Denied.html`)** and **GitHub sign-in page (`github-landing/index.html`)**: same brand bar, tech-background band and footer.
- Logos and favicon load from `ictsru.github.io/brand/logos/`.
- Printing: header band prints with dark text on white (Brand removes the pattern in print); a one-line version note is printed instead of the footer.
### Added
- Resilience: if the Brand site can't be reached, logos fall back to the embedded copies (`Logos.html`) or `github-landing/assets/`, and a small built-in style keeps the brand bar and footer laid out in plain purple.
### Fixed
- Code comment for the CCCU → DSSC legacy mapping said "v3.0"; corrected to v1.4.

## [v3.0] — 2026-10-23
Applies **SRU Secure Access Kit v1.4** — the platform is now limited to signed-in Sulaiman Al Rajhi University accounts.
### Changed (deployment model)
- The app now runs **inside the Apps Script Web App** (`apps-script/Index.html`), deployed as *Execute as: Me · Who has access: Anyone within Sulaiman Al Rajhi University*. Same Web App URL.
- GitHub Pages now hosts only the branded **sign-in landing page** (`github-landing/`): no data, no API calls.
- Data access moved from public `doGet`/`doPost` JSON endpoints to `google.script.run` functions (`apiList`, `apiSaveTask`, `apiDeleteTask`, `apiSaveMember`, `apiDeleteMember`). The old JSON API and `API_KEY` are removed.
### Added
- **Access list** `AllowedUsers` (email, name, role, active, notes) seeded with the ICTD team; checked on page load **and on every server call** (`requireSruUser_`). Owner always allowed.
- **Access log** `AccessLog`: every sign-in with date, time, day (Asia/Riyadh), e-mail, result (دخول / مرفوض / غير مدرج), version; 30-min de-duplication.
- `Denied.html` page for non-university accounts and accounts not on the list.
- **Signed-in identity:** the header shows the user's name and e-mail; update-log entries, «أُسندت بواسطة» default and `CreatedBy` use the signed-in account. New column `UpdatedBy` (e-mail, set by the server) and `By` column in `Audit`.
- Sheet menu: setup, access list, 30-day sign-in summary, purge old logs, daily reminder, show Web App URL.
- `setup()` now also creates `AllowedUsers` / `AccessLog` and fills blank Team e-mails from the access list (existing values are kept).
- Reminder e-mails include a link to the platform.
### Removed
- Browser-only demo mode and the hidden Settings page (URL / API key / "your name" are no longer needed). JSON backup moved to the Summary page.
### Fixed
- Manager daily summary used the old completion rate as «نسبة الإنجاز»; it now reports progress and completion separately (same definitions as the app).

## [v2.1] — 2026-10-06
### Fixed
- Summary «نسبة الإنجاز» showed 0 % until a task was closed as Completed, ignoring the progress entered in each task. It now reflects actual progress: average Progress % of all non-cancelled tasks (completed = 100 %).
### Changed
- Former completion rate renamed «نسبة الإكمال · Completed %» (completed tasks ÷ total); separate «متوسط التقدّم» column merged into «نسبة الإنجاز».
- Dashboard: new KPI tile «نسبة الإنجاز · Progress».
- «في الموعد» shows — instead of 0 % when no task is completed yet.
- Short legend under the member table explaining the three measures.

## [v2.0] — 2026-10-06
### Changed
- **Settings page hidden** from the navigation menu; the connection is pinned in `CONFIG.API_URL`, so team members no longer see or change it.
- Administrators can still open Settings by adding `#settings` to the page address (e.g. `…/index.html#settings`).
- Demo-mode banner no longer links to Settings.
- Consolidated release of v1.0 – v1.9 (names list, sectors NOC/SOC/DSSC/AAU/ITOC/ICTD, Google Sheets link, logos, mobile/extension, one-line bold labels, «أخرى» free-text).

## [v1.9] — 2026-10-06
### Added
- Choosing **«أخرى · Other»** in Category or Source opens a required text field to specify it (hidden and cleared otherwise).
- Source list gains an «أخرى · Other» option.
- New columns `CategoryOther` and `SourceOther` (added automatically to the `Tasks` sheet by `Code.gs`); the specified text shows in the task list, search and CSV export as «أخرى: …».

## [v1.8] — 2026-10-06
### Changed
- Every form field label now sits on **one line**: Arabic title + required mark (*) + English title, so all fields in a row align at the same height.
- All titles and labels in **bold** (field labels, English sub-labels, section and page titles, KPI and summary captions).
- Uniform 40px height for text, date and select fields; shortened long English sub-labels.

## [v1.7] — 2026-10-06
### Added
- Team: **Mobile** (رقم الجوال, format 05XXXXXXXX or +9665XXXXXXXX) and **Extension** (الرقم الداخلي) fields in the member form and team table; email and mobile are clickable (mailto / tel).
- `Code.gs`: `Team` sheet gets `Mobile` and `Extension` columns automatically (existing sheets are upgraded in place); numbers are stored as text to keep leading zeros.
### Fixed
- Blank gap in the team table's email column (cell display style).

## [v1.6] — 2026-10-06
### Added
- Official logos: Sulaiman Alrajhi University (header right), ICTD (header left), ITOC (footer bottom-left, linked to the ITOC forms hub).
- Logos embedded in `index.html` as data URIs so the page shows them even when opened alone; source files kept in `assets/` (ITOC resized to 400×160).

## [v1.5] — 2026-10-06
### Changed
- `CONFIG.API_URL` set to the production Apps Script Web App linked to the Google Sheet «سجل مهام تقنية المعلومات - ICTD Task Register»; the app now opens connected for every user (demo mode only if the URL is cleared).
- README records the Sheet ID and Web App URL.
- «العودة للوضع التجريبي» now works even with a pinned URL (per-browser demo flag).

## [v1.4] — 2026-10-06
### Changed
- Sector **CCCU** replaced by **DSSC** (code `DSSC`) in all sector lists, filters, dashboard and summary.
- Records saved earlier with sector `CCCU` are shown as DSSC automatically.

## [v1.3] — 2026-10-06
### Added
- New sector **ICTD** (code `ICTD`) in all sector lists, filters, dashboard chart and summary tables.

## [v1.2] — 2026-10-06
### Changed
- Sector «العمليات · Operation» replaced by **ITOC** (code `ITOC`) in all sector lists, filters, dashboard and summary.
- Records saved earlier with sector `Operation` are shown as ITOC automatically.

## [v1.1] — 2026-10-06
### Changed
- All name dropdowns (Assigned To, Assigned By, Reviewer, assignee filter, Team form, Settings "your name") now use the official ICTD names list (`TEAM_NAMES`, 14 names) with the placeholder «اختر الاسم».
- Team tab lists every official name; role, sector and email are added per name (one record per name).
- Demo data uses the official names; demo storage keys renamed so v1.0 sample data is not reused.
### Added
- `Code.gs` `setup()` seeds the official names into the `Team` sheet (skips names already present).

## [v1.0] — 2026-10-06
### Added
- Single-page app `index.html` (Arabic RTL, bilingual labels, SRU identity: Cairo font, purple/blue tokens, official header band, ITOC footer link).
- **Register / Edit** form in 4 sections: task details, assignment & schedule, tracking & progress, review & sign-off.
- Auto Task ID (`TSK-YYYYMMDD-NNNN` from the server; local ID in demo mode).
- Automatic **update log** recording status changes, re-assignment, review decisions and free-text notes with date and user name.
- **Task List** with search, 6 filters, table and Kanban board views, inline status change, CSV export (Excel-compatible, UTF-8 BOM).
- **Dashboard**: 6 KPI tiles, 4 charts (status, sector, member workload, open-by-priority), overdue and due-in-7-days lists.
- **Summary report** with period/sector filters, per-member and per-sector performance tables, risk list, print/PDF.
- **Team** management (name, role, sector, email, active).
- **Settings**: Apps Script URL, optional API key, user name, JSON backup, demo data.
- Google Apps Script backend `Code.gs`: `setup()`, `doGet` (list / get / stats / ping), `doPost` (saveTask / deleteTask / saveMember / deleteMember), script lock, audit log, formula-injection guard.
- Daily email automation: `installDailyReminder()` / `sendDailyDigest()` (07:00 Riyadh, weekends skipped).
- Browser-only demo mode with sample data when no backend URL is configured.
