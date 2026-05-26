/**
 * BTSSFF Google Sheets Data Layer
 * 
 * This file is the single place that talks to your Google Sheet.
 * All tools (judge dashboard, results, program builder) import from here.
 * 
 * SETUP:
 * 1. In your Google Sheet: File → Share → "Anyone with the link can view"
 * 2. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
 * 3. Paste it as SHEET_ID below
 * 4. For write operations (scores, decisions), deploy a Google Apps Script — see README.md
 */

const SHEET_ID = "YOUR_SHEET_ID_HERE";

// Tab names in your Google Sheet — change these if yours are named differently
const TABS = {
  films:    "Films",        // The FilmFreeway import tab
  scores:   "Scores",       // Judge scores (written by judge dashboard)
  decisions:"Decisions",    // Shortlist/pass/select decisions
  program:  "Program",      // Final run order (written by program builder)
};

// ─── Column mapping from FilmFreeway export ───────────────────────────────────
// These match the exact column headers in your FilmFreeway CSV / Google Sheet tab.
// If a header changes, fix it here and everything else updates automatically.
const COL = {
  title:          "Project Title",
  vimeoLink:      "Submission Link",
  password:       "Submission Password",
  synopsis:       "Synopsis",
  category:       "Submission Categories",   // e.g. "Small Short Animation"
  genres:         "Genres",
  duration:       "Duration",                // "0:04:11" format
  firstName:      "First Name",
  lastName:       "Last Name",
  city:           "City",
  state:          "State",
  country:        "Country",
  email:          "Email",
  trackingNumber: "Tracking Number",
  submissionDate: "Submission Date",
  status:         "Submission Status",       // "In Consideration" etc.
  judgingStatus:  "Judging Status",          // "Undecided" etc.
  logLine:        'Please include a one sentence "log line" of your film that will be included in the program if your film is selected.',
  instagram:      "List any instagram handles you'd like credited (tagged) if your film is chosen as an official selection. (ex. @Bigteethsmallshorts)",
  directorCredit: "Please list all person(s) that should get a director's credit on our programming and promotional listings, should your film be selected. ",
  imageConsent:   "Are you comfortable with having your film poster/image shared on our website and/or social channels if selected? (Note: saying \"No\" will not exclude you from selection)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "Small Short Animation" → { size: "Small", genre: "Animation" } */
export function parseCategory(raw = "") {
  const lower = raw.toLowerCase();
  const size  = lower.startsWith("micro") ? "Micro" : "Small";
  // strip "micro short" / "small short" prefix
  const genre = raw.replace(/^(micro|small)\s+short\s*/i, "").trim() || "—";
  return { size, genre };
}

/** Parse "0:04:11" → total seconds, also returns display string "4:11" */
export function parseDuration(raw = "") {
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    const total = h * 3600 + m * 60 + s;
    const display = h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
    return { seconds: total, display };
  }
  return { seconds: 0, display: raw };
}

/** Build a clean film object from a raw sheet row */
function normalizeFilm(row, index) {
  const { size, genre } = parseCategory(row[COL.category] || "");
  const { seconds, display: durationDisplay } = parseDuration(row[COL.duration] || "");
  const director = (row[COL.directorCredit] || `${row[COL.firstName] || ""} ${row[COL.lastName] || ""}`).trim();
  const location = [row[COL.city], row[COL.state], row[COL.country]].filter(Boolean).join(", ");

  return {
    id:              row[COL.trackingNumber] || `film-${index}`,
    title:           row[COL.title]          || "Untitled",
    director,
    location,
    synopsis:        row[COL.synopsis]       || "",
    logLine:         row[COL.logLine]        || row[COL.synopsis] || "",
    category:        row[COL.category]       || "",
    size,                                    // "Micro" | "Small"
    genre,
    durationRaw:     row[COL.duration]       || "",
    durationSeconds: seconds,
    durationDisplay,
    vimeoLink:       row[COL.vimeoLink]      || "",
    password:        row[COL.password]       || "",
    instagram:       row[COL.instagram]      || "",
    status:          row[COL.status]         || "In Consideration",
    judgingStatus:   row[COL.judgingStatus]  || "Undecided",
    email:           row[COL.email]          || "",
    imageConsent:    row[COL.imageConsent]   || "",
    submissionDate:  row[COL.submissionDate] || "",
  };
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

/**
 * Fetch any tab from the Google Sheet as an array of objects.
 * Uses the public CSV export endpoint — no API key needed for view-only sheets.
 */
async function fetchTab(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Could not load sheet tab "${tabName}": ${res.status}`);
  const text = await res.text();
  return csvToObjects(text);
}

/** Minimal CSV parser (handles quoted fields with commas and newlines) */
function csvToObjects(text) {
  const rows    = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || "").trim(); });
    return obj;
  });
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"')           { inQuotes = false; }
      else                          { field += c; }
    } else {
      if      (c === '"')  { inQuotes = true; }
      else if (c === ',')  { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else                 { field += c; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load all films from the Films tab, normalized and sorted by title */
export async function loadFilms() {
  const rows = await fetchTab(TABS.films);
  return rows.map(normalizeFilm).filter(f => f.title !== "Untitled" || f.vimeoLink);
}

/** Load all scores: returns Map<filmId, { judge1: {...scores}, judge2: {...} }> */
export async function loadScores() {
  try {
    const rows = await fetchTab(TABS.scores);
    const map  = new Map();
    for (const row of rows) {
      const { filmId, judge, ...scores } = row;
      if (!filmId) continue;
      if (!map.has(filmId)) map.set(filmId, {});
      map.get(filmId)[judge] = scores;
    }
    return map;
  } catch { return new Map(); }
}

/** Load decisions: returns Map<filmId, { shortlist, decision, notes }> */
export async function loadDecisions() {
  try {
    const rows = await fetchTab(TABS.decisions);
    const map  = new Map();
    for (const row of rows) {
      if (row.filmId) map.set(row.filmId, row);
    }
    return map;
  } catch { return new Map(); }
}

/** Load program order: returns ordered array of { filmId, slot, notes } */
export async function loadProgram() {
  try {
    const rows = await fetchTab(TABS.program);
    return rows.sort((a, b) => Number(a.slot) - Number(b.slot));
  } catch { return []; }
}

/**
 * Write data back to the sheet via a Google Apps Script web app.
 * See README.md for how to deploy the Apps Script.
 * 
 * @param {string} action  - "saveScore" | "saveDecision" | "saveProgram"
 * @param {object} payload - data to write
 */
export async function writeToSheet(action, payload) {
  const APPS_SCRIPT_URL = window.BTSSFF_WRITE_URL || "";
  if (!APPS_SCRIPT_URL) {
    console.warn("BTSSFF: No write URL configured. Set window.BTSSFF_WRITE_URL before calling writeToSheet().");
    return { ok: false, error: "No write URL configured" };
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

// Export column map so individual tools can reference it if needed
export { COL, TABS, SHEET_ID };
