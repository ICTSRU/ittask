# إدارة مهام تقنية المعلومات · IT Task List Management — v2.0

**Register, assign, track, and review departmental tasks** — Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)

A single-page, Arabic-first (RTL, bilingual labels) web app hosted on **GitHub Pages**, with **Google Sheets** as the shared database through a **Google Apps Script Web App**.

---

## 1. Features · المزايا

| Module | الوحدة | What it does |
|---|---|---|
| Dashboard | لوحة المعلومات | 6 KPI tiles (total, open, overdue, under review, completed, on-time %), charts by status / sector / member workload / priority, overdue and due-in-7-days lists, sector filter |
| Task List | قائمة المهام | Search + filters (status, sector, priority, assignee, overdue/due-soon/awaiting review), **table or Kanban board** view, inline status change, CSV/Excel export |
| Register / Edit | تسجيل مهمة | 4 sections: Task details → Assignment & schedule → Tracking & progress → Review & sign-off. Auto ID, progress slider, automatic **update log** (date · name · change) |
| Summary | الملخص والتقارير | Period (week / month / quarter / year / custom) and sector filters; headline figures; performance by member and by sector; overdue & on-hold risk list; **print / save as PDF** |
| Team | فريق العمل | Shows the **official ICTD names list**; add role, sector, email, mobile and extension per name (email enables reminders) |
| Settings (hidden) | الإعدادات (مخفية) | Not in the menu since v2.0 — administrators open it with `index.html#settings` (Apps Script URL override, API key, name for the log, JSON backup, demo data) |

**Built-in business rules**
- Saving a *New* task with an assignee → status becomes *Assigned*.
- *Completed* → progress 100 % and completed date filled automatically.
- Review result *Returned for rework* on an *Under Review* task → back to *In Progress*.
- Overdue = open task with due date before today. On-time = completed on or before due date.

**Workflow:** `New → Assigned → In Progress ⇄ On Hold → Under Review → (Approved) Completed` · or `Cancelled`.

---

## 2. Repository structure · هيكل المستودع

```
it-task-list-v2.0/
├── index.html      ← the app (version shown in the header and footer)
├── Code.gs         ← Google Apps Script backend (paste into the Sheet's script editor)
├── README.md
├── CHANGELOG.md
└── assets/
    ├── sru-logo.png    ← university logo (header, right)
    ├── ictd-logo.png   ← ICTD logo (header, left)
    └── itoc-logo.png   ← ITOC logo (footer, bottom-left → ITOC forms hub)
```

> The three official logos are embedded inside `index.html` (works even if the page is opened on its own); the same files are kept in `assets/` for reuse.

---

## 3. Setup — Google Sheets backend (≈10 minutes)

1. Create a new Google Sheet, e.g. **«سجل مهام تقنية المعلومات - ICTD Task Register»**.
2. **Extensions → Apps Script**, delete the default code, paste **`Code.gs`**, save.
3. (Optional) Set at the top of `Code.gs`:
   - `API_KEY` — any random string (also enter it in the app's Settings).
   - `MANAGER_EMAIL` — address that receives the daily summary.
4. Select **`setup`** in the function dropdown → **Run** → authorise. Tabs `Tasks`, `Team`, `Audit` are created.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or *Anyone within sr.edu.sa* if all users browse while signed in to the university Google account)
6. Copy the **Web app URL** (ends with `/exec`).
7. Either:
   - **For the whole team:** edit `CONFIG.API_URL` near the top of the `<script>` in `index.html`, then push to GitHub; **or**
   - **Per browser:** open the app → **الإعدادات / Settings** → paste the URL → *Save & test*.

> After changing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the same URL keeps working.

### Current connection (v2.0)
- Google Sheet: **سجل مهام تقنية المعلومات - ICTD Task Register** — `1cOZUlGSQt7_jqb3aXevGfCT0qTmywDFjS9s4oreKcxk`
- Web App URL (set in `CONFIG.API_URL`): `https://script.google.com/macros/s/AKfycbxRA9He5zQE5--S7RueMEbR7S1kIVyz1nFZCIcf_-vQoRXY9DszeqPtLv95VwRhKenV/exec`

## 4. Publish on GitHub Pages

1. Push the folder to a repository (e.g. inside `ictsru/ITOC`).
2. **Settings → Pages → Deploy from branch → main / root**.
3. App URL: `https://<org>.github.io/<repo>/it-task-list-v2.0/` — add it to the ITOC forms hub.

## 5. Automation · الأتمتة (recommended)

Run **`installDailyReminder()`** once in Apps Script. Every working day at 07:00 (Riyadh; Friday/Saturday skipped):
- each team member with an email gets their **overdue** and **due-within-3-days** tasks;
- `MANAGER_EMAIL` gets a daily summary (totals, overdue list, completion rate).

## 6. Security notes · ملاحظات أمنية

- The API key in a public GitHub page is visible to anyone who reads the source — treat it as a light filter, not authentication. For stronger control, deploy with **"Anyone within sr.edu.sa"**.
- Inputs are HTML-escaped in the app, and values starting with `= + - @` are neutralised in the sheet (formula-injection protection).
- Every create / update / delete is written to the `Audit` tab.
- Demo mode stores data in the browser only (`localStorage`); nothing leaves the device.

## 7. Data model — `Tasks` sheet

`TaskID · Title · Description · Sector · Category · Priority · Source · TicketRef · AssignedTo · AssignedBy · StartDate · DueDate · Status · Progress · CompletedDate · Reviewer · ReviewDate · ReviewResult · ReviewNotes · UpdateLog · CreatedAt · UpdatedAt · CreatedBy · CategoryOther · SourceOther`

Stored codes → Status: `new, assigned, in_progress, on_hold, under_review, completed, cancelled` · Priority: `critical, high, medium, low` · Sector: `NOC, SOC, DSSC, AAU, ITOC, ICTD` · ReviewResult: `approved, returned, rejected`.

**Names:** every name dropdown (Assigned To, Assigned By, Reviewer, assignee filter, Team, Settings) uses the `TEAM_NAMES` list at the top of the script in `index.html` — and the same list in `Code.gs` seeds the `Team` sheet. Edit both together to add or remove people.

To change sectors, categories or sources, edit the `SECTORS`, `CATEGORIES`, `SOURCES` objects at the top of the script in `index.html`.

---

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
