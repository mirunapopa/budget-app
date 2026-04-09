import { SHEET_ID, GOOGLE_CLIENT_ID, SCOPES, TABS, INPUT_RANGES } from '../config.js';

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

// ─── Init ────────────────────────────────────────────────────────────────────

export async function initGoogleAPI() {
  return new Promise((resolve, reject) => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        maybeResolve(resolve);
      });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '',
      });
      gisInited = true;
      maybeResolve(resolve);
    };
    gisScript.onerror = reject;
    document.body.appendChild(gisScript);
  });

  function maybeResolve(resolve) {
    if (gapiInited && gisInited) resolve();
  }
}

export function isSignedIn() {
  return !!window.gapi?.client?.getToken();
}

export async function signIn() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp);
      else resolve(resp);
    };
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

export function signOut() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

// ─── Read budgets from Input Section ─────────────────────────────────────────

export async function fetchBudgets() {
  const [monthRes, thresholdRes, personalRes, coupleRes] = await Promise.all([
    window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: INPUT_RANGES.CURRENT_MONTH }),
    window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: INPUT_RANGES.VARIABILITY_THRESHOLD }),
    window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: INPUT_RANGES.PERSONAL_BUDGETS }),
    window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: INPUT_RANGES.COUPLE_BUDGETS }),
  ]);

  const parsebudgetRows = (rows) => {
    const budgets = {};
    (rows || []).forEach(([cat, val]) => {
      if (cat && val) budgets[cat.trim()] = parseFloat(val.replace('€','').replace(',','')) || 0;
    });
    return budgets;
  };

  return {
    currentMonth: monthRes.result.values?.[0]?.[0] || '',
    variabilityThreshold: parseFloat(thresholdRes.result.values?.[0]?.[0]) || 0.20,
    personal: parsebudgetRows(personalRes.result.values),
    couple: parsebudgetRows(coupleRes.result.values),
  };
}

// ─── Read transactions for current month ─────────────────────────────────────

export async function fetchTransactions() {
  const res = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.FORM_RESPONSES}!A2:H`,
  });

  const rows = res.result.values || [];
  return rows.map(([timestamp, category, description, amount, type, month, date, week]) => ({
    timestamp,
    category,
    description,
    amount: parseFloat(amount) || 0,
    type,
    month,
    date,
    week,
  }));
}

// ─── Append a new transaction ─────────────────────────────────────────────────

export async function appendTransaction({ category, description, amount, type }) {
  const now = new Date();

  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Month: 01/04/2026 format (first of the month)
  const month = `01/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

  // Date: DD/MM/YYYY
  const date = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

  // ISO week number
  const week = getISOWeek(now);

  const row = [timestamp, category, description, amount, type, month, date, week];

  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TABS.FORM_RESPONSES}!A:H`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });

  return row;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}
