# 💸 Budget App

A mobile-first PWA that replaces your Google Form with a fast native input, reads your budgets from your existing Google Sheet, and shows you the same daily/monthly tracking logic you already use — but actually nice to use.

## What it does

- **Quick Add** — tap category, enter amount, done in 3 taps. Writes directly to your Form responses sheet.
- **Today** — today's total spend, reasonability flag, transaction list.
- **Month** — per-category breakdown with progress bars, daily budget remaining, and your variability threshold logic (reasonable/no).
- **Personal / Couple toggle** — switch between your two budget sets in the header.

---

## Setup (one time, ~20 mins)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/budget-app.git
cd budget-app
npm install
```

### 2. Get your Google Sheet ID

Open your spreadsheet. The URL looks like:
```
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXX/edit
```
Copy the long ID between `/d/` and `/edit`. That's your `SHEET_ID`.

### 3. Set up Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (name it "budget-app" or anything)
3. Go to **APIs & Services → Enable APIs**
4. Search for and enable **Google Sheets API**

### 4. Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Choose **Web application**
4. Add these to **Authorised JavaScript origins**:
   - `http://localhost:5173` (for local dev)
   - `https://YOUR_USERNAME.github.io` (for production)
5. Copy the **Client ID**

### 5. Configure OAuth consent screen

1. Go to **OAuth consent screen**
2. Choose **External**
3. Fill in app name, support email
4. Add your Google account as a **Test user**
5. Add scope: `https://www.googleapis.com/auth/spreadsheets`

### 6. Add your credentials

Open `src/config.js` and fill in:

```js
export const SHEET_ID = 'your-sheet-id-here';
export const GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

### 7. Verify tab names

In `src/config.js`, check that `TABS` matches your exact sheet tab names (they're case sensitive):

```js
export const TABS = {
  FORM_RESPONSES:   'Form responses',   // ← your transactions tab
  INPUT_SECTION:    'Input section',    // ← where budgets are set
  ...
};
```

### 8. Verify budget cell ranges

Your Input Section tab has:
- **Personal budgets**: categories in col B, amounts in col C, rows 10–14
- **Couple budgets**: categories in col B, amounts in col C, rows 18–22
- **Current month**: col C, row 4
- **Variability threshold**: col C, row 24

If your layout differs, update `INPUT_RANGES` in `src/config.js`.

---

## Run locally

```bash
npm run dev
```

Open `http://localhost:5173/budget-app/` — sign in with Google, and you're live.

---

## Deploy to GitHub Pages

1. Create a GitHub repo called `budget-app`
2. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/budget-app.git
git push -u origin main
```
3. Deploy:
```bash
npm run deploy
```
4. Go to your repo **Settings → Pages**, set source to `gh-pages` branch.
5. Your app will be live at `https://YOUR_USERNAME.github.io/budget-app/`
6. Add that URL to your OAuth credentials in Google Cloud (Authorised JavaScript origins).

---

## Add to iPhone home screen (PWA)

1. Open the app in Safari
2. Tap the Share button → **Add to Home Screen**
3. Done — it opens fullscreen like a native app

---

## How the data flows

```
App reads:
  Input section tab → budgets, current month, variability threshold

App writes:
  Form responses tab → new row with:
    Timestamp | Category | Description | Amount | Type | Month | Date | Week
    (same format as your Google Form — dashboard formulas keep working)
```

---

## Folder structure

```
src/
  api/sheets.js       ← all Google Sheets API calls
  hooks/useBudgetStats.js  ← variability threshold logic
  config.js           ← your Sheet ID, tab names, categories
  App.jsx             ← main UI
  index.css           ← styles
```

---

## Troubleshooting

**"Failed to load Google API"** — Check your Client ID in `config.js` and that the domain is in your OAuth origins.

**Sign in popup blocked** — Allow popups for the site in your browser.

**Data not loading** — Check tab names in `config.js` match exactly (case-sensitive). Check the Sheet is accessible to your Google account.

**Wrong budget values** — Check the row/column references in `INPUT_RANGES` match your actual Input Section layout.
