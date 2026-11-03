# IT Task List Management — automatic Apps Script update (autodeploy v1.5)

Same mechanism as the SOP platform (`ICTSRU/SOP`). After a **one-time setup (~5 min)**, updating the platform means only: **upload the files to GitHub**.
GitHub then pushes them to Apps Script and publishes a new version on the **same /exec URL** — no copy-paste, no "Manage deployments".

```
GitHub repo ICTSRU/ittask (apps-script/)  ──push──▶  GitHub Action (clasp)  ──▶  Apps Script project + New version (same URL)
```

## One-time setup

Steps 1–2 were already done for the SOP platform (same Google account) — reuse them.

| # | Step | Where |
|---|---|---|
| 1 | **Apps Script API → ON** (account that owns the project: m.elmahdy@sr.edu.sa) — *already done for SOP* | script.google.com/home/usersettings |
| 2 | **`CLASPRC_JSON`** — the same content of `.clasprc.json` used for SOP. If the local file was deleted: `npx @google/clasp@2.4.2 login` again (cmd, not PowerShell) and copy `%USERPROFILE%\.clasprc.json` | Your computer |
| 3 | **`SCRIPT_ID`** (⚠ each platform has its own — do not reuse SOP's) — open the Sheet «سجل مهام تقنية المعلومات - ICTD Task Register» ▸ Extensions ▸ Apps Script ▸ ⚙️ Project Settings ▸ IDs ▸ **Script ID** | Apps Script editor |
| 4 | GitHub ▸ **ICTSRU/ittask** ▸ Settings ▸ Secrets and variables ▸ Actions ▸ **New repository secret** ×2: `CLASPRC_JSON` (step 2) · `SCRIPT_ID` (step 3) | GitHub |
| 5 | Actions tab ▸ **Deploy Apps Script** ▸ **Run workflow** → green ✅ = done | GitHub |

`DEPLOYMENT_ID` is **not needed**: the workflow already uses this platform's live web app (`AKfycbxRA9He5zQE5…`, the ID inside its /exec link). Add a `DEPLOYMENT_ID` secret only if you ever create a new deployment.

### Tip — set `CLASPRC_JSON` once for every platform
In the **ICTSRU organisation** ▸ Settings ▸ Secrets and variables ▸ Actions ▸ **New organization secret** `CLASPRC_JSON` (Repository access: all repositories). Then each new platform needs only its own `SCRIPT_ID`. A repository secret with the same name overrides the organisation one.

## Every update afterwards

Upload the changed files under `apps-script/` (and/or `index.html`) to the repo → **Commit**. The Action runs within ~1 minute; the run summary shows "Apps Script updated to vX.Y".

## Notes

- **Edit code only in GitHub from now on.** The Action replaces all code files in the Apps Script project with the repo's copy (`Code`, `Index`, `Logos`, `Denied`); the project's own `appsscript.json` is kept. Edits made in the Apps Script editor would be overwritten on the next update.
- **Privacy:** the repo is public (GitHub Pages). `DEFAULT_ALLOWED` in `Code.gs` is empty — the real access list lives only in the `AllowedUsers` tab of the Sheet.
- Settings kept in `Code.gs` (e.g. `MANAGER_EMAIL`, `OWNER_EMAILS`) are now changed in GitHub, not in the editor.
- If the Workspace admin blocks third-party apps, allow **"Google Apps Script CLI"** in Google Admin ▸ Security ▸ API controls.
- Rollback: Deploy ▸ Manage deployments ▸ ✏️ ▸ choose an earlier version.

## Troubleshooting

| Message in the Action | Fix |
|---|---|
| `Missing repository secret(s): SCRIPT_ID` (or `CLASPRC_JSON`) | Add it with that exact name in ICTSRU/ittask (step 4) |
| `CLASPRC_JSON does not contain refresh_token` | Paste the **whole** content of `.clasprc.json` |
| `User has not enabled the Apps Script API` | Step 1, with the account that owns the project |
| `SCRIPT_ID points to a different Apps Script project` | The secret holds another platform's Script ID (e.g. SOP). Nothing was pushed. Replace `SCRIPT_ID` with the Script ID opened **from the Task Register Sheet** (Extensions ▸ Apps Script ▸ Project Settings) |
| `Could not find script` / `Requested entity was not found` | `SCRIPT_ID` belongs to another project — copy it from the Task Register's Apps Script |
| `invalid_grant` | The CLI access was revoked — repeat `clasp login` and update `CLASPRC_JSON` |
