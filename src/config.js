// ─── CONFIGURE THESE ────────────────────────────────────────────────────────
export const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE';

// Tab names — update if yours differ
export const TABS = {
  FORM_RESPONSES: 'Form responses',   // where transactions are appended
  INPUT_SECTION:  'Input section',    // where budgets are stored
  PERSONAL_SUMMARY: 'Personal Summary',
  COUPLE_SUMMARY:   'Couple Summary',
};

export const CATEGORIES = ['Groceries', 'Outings', 'Shopping', 'Other', 'Travel'];
export const TYPES = ['Personal', 'Couple'];

// Input Section tab — cell references for budgets (B col = col index 1)
// Personal budgets: rows 10-14 (0-indexed: 9-13), col D (index 3) = budget value
// Couple budgets: rows 18-22 (0-indexed: 17-21), col D (index 3) = budget value
// Current month: row 4 (0-indexed: 3), col C (index 2)
// Variability threshold: row 24 (0-indexed: 23), col C (index 2)
export const INPUT_RANGES = {
  CURRENT_MONTH:          'Input section!C4',
  VARIABILITY_THRESHOLD:  'Input section!C24',
  PERSONAL_BUDGETS:       'Input section!B10:C14',  // category | budget
  COUPLE_BUDGETS:         'Input section!B18:C22',  // category | budget
};

export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
