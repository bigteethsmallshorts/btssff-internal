# Big Teeth Small Shorts Film Fest — Internal Tools
## Plain-English Setup Guide

This repo holds all the internal tools for running the fest:
- **Judge Dashboard** — judges score films
- **Results** — pick winners, manage shortlist
- **Program Builder** — set the run of show order
- **Public awards page** — the permanent page that goes on the website

Everything reads from (and writes back to) your Google Sheet.
No Wix. No monthly fees. Just files in GitHub.

---

## One-time setup (do this once, then you're done)

### Step 1 — Set up your Google Sheet

1. Take your FilmFreeway CSV export and open Google Sheets
2. Create a new Google Sheet and paste/import the CSV into a tab called **Films**
3. Add three more tabs: **Scores**, **Decisions**, **Program**
4. Go to **File → Share → Share with anyone who has the link → Viewer**
5. Copy the Sheet ID — it's the long string in the URL between `/d/` and `/edit`
   - Example URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit`
   - Sheet ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

### Step 2 — Put your Sheet ID into the tools

In `judge-dashboard/index.html`, find this line near the top of the script:
```
const SHEET_ID = "YOUR_SHEET_ID_HERE";
```
Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID.

Do the same in `results/index.html` and `program-builder/index.html` when those are built.

### Step 3 — GitHub repo and free hosting

1. Go to github.com and create a new account (suggested name: `bigteethsmallshorts`)
2. Create a new repo called `btssff-internal` — set it to **Private**
3. Upload all these files to it
4. Go to repo **Settings → Pages → Source: main branch, root folder → Save**
5. GitHub will give you a free URL like `bigteethsmallshorts.github.io/btssff-internal`

### Step 4 — Set up your subdomain (optional but nice)

Once you have the GitHub Pages URL, you can point `tools.bigteethsmallshorts.com` at it.
Your domain registrar (wherever bigteethsmallshorts.com is registered) will have a DNS settings page.
Add a CNAME record: `tools` → `bigteethsmallshorts.github.io`

This doesn't touch your main Wix site at all.

---

## Passwords

The judge dashboard has a simple password gate.
Open `judge-dashboard/index.html` and find:
```js
const GATE_PASSWORDS = {
  "judges2026":  "Judges",
  "team2026":    "Team",
};
```

Change these to whatever passwords you want. The left side is what judges type.
The right side is the label that shows up on their dashboard ("Scoring as: Judges").

To add a named judge (so their scores are tracked separately):
```js
const GATE_PASSWORDS = {
  "sarah2026":   "Sarah",
  "marcus2026":  "Marcus",
  "team2026":    "Team",
};
```

---

## How the data flows

```
FilmFreeway CSV
    ↓ paste into Google Sheet (Films tab)
    ↓
Judge Dashboard → reads Films tab, saves scores to localStorage
    ↓ (export CSV → paste into Scores tab, OR Apps Script auto-writes)
Results page → reads Films + Scores, saves decisions
    ↓
Program Builder → reads selected films, sets run order
    ↓
Public awards page → reads everything, generates the season page
```

---

## Each new season

1. Export new submissions from FilmFreeway
2. Paste into the Films tab (clear old data first, or make a new sheet)
3. Reset the judge passwords if you want
4. Done — all tools work immediately

---

## Write-back (scores auto-saving to Google Sheets)

Right now, scores save to the judge's browser (localStorage) and can be exported as CSV.
To have them write directly to the sheet without CSV import, you need a Google Apps Script.

**This is optional** — the CSV export workflow is simple and works fine.

If you want the auto-write setup, let Claude know and it will walk you through deploying the Apps Script (about 10 minutes, no coding required).
