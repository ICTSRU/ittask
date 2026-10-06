# CHANGELOG — IT Task List Management

All notable changes to this project are recorded here. Versions use one digit after the decimal point (… v1.8, v1.9, v2.0).

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
