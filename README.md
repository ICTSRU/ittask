# إدارة مهام تقنية المعلومات · IT Task List Management — v3.3

**Register, assign, track, and review departmental tasks** — Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)

Secured with **SRU Secure Access Kit v1.4**: only Sulaiman Al Rajhi University Google accounts (**@sr.edu.sa**) on the access list can open the platform, and every sign-in is logged.
Styled with the **SRU Brand Kit**, linked live from `https://ictsru.github.io/brand` (tech background, brand bar, footer, logos).

```
ictsru.github.io/<repo>   →   Google sign-in (@sr.edu.sa)   →   Apps Script Web App
 (branded landing page)        (Google's own page)              (the platform, access-checked)
```

---

## 1. Repository layout (ICTSRU/ittask)

| Path | Purpose |
|---|---|
| `index.html`, `assets/`, `.nojekyll` | Branded sign-in page served by GitHub Pages — holds **no data** |
| `apps-script/Code.gs` | Server: access list, sign-in log, task/team API (`google.script.run`), daily reminder, sheet menu |
| `apps-script/Index.html` | The platform UI (dashboard, task list, register, summary, team) |
| `apps-script/Logos.html` | Embedded SRU / ICTD / ITOC logos (fallback when the Brand site is unreachable) |
| `apps-script/Denied.html` | Shown to non-university accounts / accounts not on the list |
| `.github/workflows/deploy-apps-script.yml` | **Automatic update**: pushes `apps-script/` to Apps Script and publishes a new version (same URL) |
| `AUTODEPLOY.md` | One-time setup and troubleshooting for the automatic update |
| `README.md`, `CHANGELOG.md` | Documentation and change record |

## 2. Updating from v3.3 on — automatic (GitHub → Apps Script)

A push that changes `apps-script/**` runs **Actions ▸ Deploy Apps Script**: it pushes the files to the Apps Script project bound to the Sheet and moves the existing deployment to a new version — **same /exec URL**. Same mechanism as the SOP platform. One-time setup (2 secrets: `CLASPRC_JSON`, `SCRIPT_ID`) and troubleshooting: [AUTODEPLOY.md](AUTODEPLOY.md).

- Edit code **only in GitHub** from now on (the Action replaces the project's code files with the repo's copy; `appsscript.json` is kept).
- Manual run: Actions ▸ Deploy Apps Script ▸ Run workflow. Rollback: Deploy ▸ Manage deployments ▸ ✏️ ▸ earlier version.
- The staff list is **not** in the code (public repo): manage people in the `AllowedUsers` tab.
- Sign-in page changes (`index.html`) go live through GitHub Pages as before.

> Sections 2.1–2.3 below are the manual steps used before v3.3, kept for reference.

## 2.1 Upgrade from v2.x (≈10 minutes) — manual, before v3.3

1. Open the Sheet **«سجل مهام تقنية المعلومات - ICTD Task Register»** → **Extensions ▸ Apps Script** (the existing project).
2. Replace **`Code.gs`** with `apps-script/Code.gs`.
3. Add three HTML files with **exactly** these names (＋ ▸ HTML): **`Index`**, **`Logos`**, **`Denied`** — paste the matching files. Save.
4. Select **`setup`** ▸ **Run** ▸ approve permissions. This creates/updates `Tasks`, `Team`, `Audit`, **`AllowedUsers`**, **`AccessLog`**; existing data is kept.
5. Check the **`AllowedUsers`** tab (from v3.3 the code seeds only the owner — add team e-mails there). Untick anyone who should not have access.
6. **Deploy ▸ Manage deployments ▸ ✏️ Edit**
   - Version: **New version**
   - Execute as: **Me**
   - Who has access: **Anyone within Sulaiman Al Rajhi University**
   - **Deploy** — the URL stays the same.
   *(If the access option can't be changed on the existing deployment: Deploy ▸ New deployment with these settings, then put the new URL in `github-landing/index.html` → `CONFIG.WEB_APP_URL`.)*
7. **GitHub:** replace the repo contents with `github-landing/` (+ `README.md`, `CHANGELOG.md`). The old `index.html` app is replaced by the sign-in page.
8. **Test:** own account ✓ · Incognito → Google sign-in → platform ✓ · personal Gmail → «الدخول متاح لمنسوبي الجامعة فقط» ✓ · university account not on the list → «الوصول مقيّد» ✓.
9. Optional: sheet menu **IT Task List Management ▸ تفعيل التذكير اليومي** (07:00, Sun–Thu).

## 2.3 Update to v3.2 (sign-in page only) — manual, before v3.3

Upload `github-landing/index.html` to the GitHub repo (replace), plus `README.md` and `CHANGELOG.md`. Commit: `v3.2 — sign-in page like Daily Check Report`. Nothing changes in Apps Script.

## 2.2 Update to v3.1 in one pass (Brand Kit) — manual, before v3.3

Prerequisite (done once for all platforms): the Brand repo **ICTSRU/brand** is published — check that `https://ictsru.github.io/brand/` opens.

| # | Where | Action |
|---|---|---|
| 1 | Apps Script project of the Sheet | Replace **`Index`** and **`Denied`** with `apps-script/Index.html` and `apps-script/Denied.html`; replace **`Code.gs`** (version 3.1). `Logos` is unchanged. Save all (Ctrl+S). |
| 2 | Apps Script | **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy** (URL unchanged). |
| 3 | GitHub repo of the platform | Upload `github-landing/index.html` (replace), `README.md`, `CHANGELOG.md`. `assets/` stays as the offline fallback. Commit: `v3.1 — SRU Brand Kit`. |
| 4 | Browser | Open the GitHub page (Ctrl+F5) → sign in → check: brand bar, moving network in the purple band, «For Support» footer with ITOC badge, version **v3.1**. |

No `setup` run is needed — the sheet structure did not change.

**Future Brand changes** (colours, logos, footer): edit them once in **ICTSRU/brand** — this platform picks them up on next load. Add `?v=1.2` to the two `<link>` lines only if browsers keep showing the old look.

## 3. Access control

| Setting (top of `Code.gs`) | Default | Meaning |
|---|---|---|
| `ACCESS_MODE` | `'LIST'` | Only **active** e-mails in `AllowedUsers` (+ `OWNER_EMAILS`). `'DOMAIN'` = any @sr.edu.sa account |
| `OWNER_EMAILS` | `m.elmahdy@sr.edu.sa` | Always allowed (cannot be locked out) |
| `DEFAULT_ALLOWED` | empty (public repo) | Optional seed list for `AllowedUsers`; the real list is the `AllowedUsers` tab |
| `ACCESS_CACHE_SECONDS` | 120 | List changes apply within 2 minutes |

- Grant: add a row · Suspend: untick `active` · Remove: delete the row.
- The list is checked when the page opens **and on every save/delete** (`requireSruUser_`).

## 4. Sign-in log — `AccessLog`

`timestamp · date · time · day · email · result (دخول / مرفوض / غير مدرج) · version` — Asia/Riyadh time; the same user within 30 minutes = one row. Sheet menu: 30-day summary, delete entries older than 180 days.

## 5. Who did what

| Where | Recorded |
|---|---|
| Header of the page | Signed-in name · e-mail |
| `UpdateLog` (each task) | Date · name of the signed-in user · change |
| `CreatedBy` | Name of the signed-in user who created the task (set by the server) |
| `UpdatedBy` | E-mail of the last editor (set by the server) |
| `Audit` tab | Every create / update / delete with the editor's e-mail |

Names are resolved from the `Team` tab (by e-mail), then the `AllowedUsers` name column.

## 6. Features

| Module | What it does |
|---|---|
| لوحة المعلومات · Dashboard | KPI tiles (total, open, overdue, under review, progress, completed, on-time), charts by status / sector / workload / priority, overdue and due-in-7-days lists |
| قائمة المهام · Task List | Search + 6 filters, table or Kanban, inline status change, CSV export |
| تسجيل مهمة · Register | Task details → assignment → tracking (progress, update log) → review & sign-off; «أخرى» free-text |
| الملخص والتقارير · Summary | Period/sector filters, headline figures, performance by member and sector, risk list, print/PDF, CSV, JSON backup |
| فريق العمل · Team | Official names list with role, sector, e-mail, mobile, extension |

Measures: **نسبة الإنجاز (Progress)** = average progress of non-cancelled tasks (completed = 100 %) · **نسبة الإكمال (Closed)** = completed ÷ total · **في الموعد (On-time)** = completed on or before the due date.

Sectors: NOC · SOC · DSSC · AAU · ITOC · ICTD.

## 7. Data model

**Tasks:** `TaskID · Title · Description · Sector · Category · Priority · Source · TicketRef · AssignedTo · AssignedBy · StartDate · DueDate · Status · Progress · CompletedDate · Reviewer · ReviewDate · ReviewResult · ReviewNotes · UpdateLog · CreatedAt · UpdatedAt · CreatedBy · CategoryOther · SourceOther · UpdatedBy`

**Team:** `MemberID · Name · Role · Sector · Email · Active · Mobile · Extension` · **Audit:** `Timestamp · Action · RecordID · Summary · By`
**AllowedUsers:** `email · name · role · active · notes` · **AccessLog:** see §4

## 8. Notes

- Keep the spreadsheet **private** — it holds staff e-mails and the access list. "Execute as: Me" lets the page read it without sharing it.
- To update code: commit to `apps-script/` in GitHub — the Action publishes a new version automatically (URL unchanged). See [AUTODEPLOY.md](AUTODEPLOY.md).
- Re-show a skipped landing page with `…/#login`.

---

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
