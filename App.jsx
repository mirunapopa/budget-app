import { useState, useEffect, useCallback } from 'react';
import { initGoogleAPI, isSignedIn, signIn, signOut, fetchBudgets, fetchTransactions, appendTransaction } from './api/sheets.js';
import { useBudgetStats } from './hooks/useBudgetStats.js';
import { CATEGORIES, TYPES } from './config.js';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
  </svg>
);
const TodayIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  Groceries: '#4ade80',
  Outings:   '#fb923c',
  Shopping:  '#a78bfa',
  Other:     '#60a5fa',
  Travel:    '#f472b6',
};

// ─── Component: Quick Add ─────────────────────────────────────────────────────
function QuickAdd({ onAdd, loading }) {
  const [type, setType] = useState('Personal');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = category && amount && parseFloat(amount) > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({ type, category, description, amount: parseFloat(amount) });
    setCategory('');
    setAmount('');
    setDescription('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="quick-add">
      {submitted && <div className="toast">✓ Added!</div>}

      {/* Type toggle */}
      <div className="type-toggle">
        {TYPES.map(t => (
          <button
            key={t}
            className={`type-btn ${type === t ? 'active' : ''}`}
            onClick={() => setType(t)}
          >
            {t === 'Personal' ? '👤' : '👥'} {t}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="section-label">Category</div>
      <div className="cat-grid">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-chip ${category === cat ? 'active' : ''}`}
            style={{ '--cat-color': CAT_COLORS[cat] }}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="section-label">Amount (€)</div>
      <input
        className="amount-input"
        type="number"
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />

      {/* Description */}
      <div className="section-label">Description <span className="optional">(optional)</span></div>
      <input
        className="desc-input"
        type="text"
        placeholder="Lidl, coffee, cinema..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />

      <button
        className={`submit-btn ${canSubmit ? 'ready' : ''} ${loading ? 'loading' : ''}`}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {loading ? 'Saving...' : 'Add Expense'}
      </button>
    </div>
  );
}

// ─── Component: Reasonability Badge ──────────────────────────────────────────
function Badge({ ok }) {
  if (ok === null) return <span className="badge neutral">–</span>;
  return <span className={`badge ${ok ? 'yes' : 'no'}`}>{ok ? 'yes' : 'no'}</span>;
}

// ─── Component: Today View (Home Screen) ─────────────────────────────────────
function TodayView({ stats, type }) {
  if (!stats) return <div className="loading-state">Loading...</div>;

  const { todayTotal, todayTx, overallReasonable, categoryStats, daysRemaining } = stats;

  // Total daily budget remaining across all categories
  const totalDailyRemaining = categoryStats
    .filter(c => c.monthlyBudget > 0)
    .reduce((s, c) => s + c.dailyBudgetLeft, 0);

  const canStillSpendToday = Math.max(0, totalDailyRemaining - todayTotal);
  const isPositive = canStillSpendToday > 0;

  return (
    <div className="today-view">
      {/* Hero — the number that matters */}
      <div className={`today-hero ${isPositive ? '' : 'hero-over'}`}>
        <div className="hero-label">you can still spend today</div>
        <div className="hero-amount">€{canStillSpendToday.toFixed(2)}</div>
        <div className="hero-sub">
          spent €{todayTotal.toFixed(2)} today · <Badge ok={overallReasonable} />
        </div>
      </div>

      {/* Per-category daily remaining */}
      <div className="card">
        <div className="card-title">daily budget left per category</div>
        {categoryStats.filter(c => c.monthlyBudget > 0).map(c => {
          const todayInCat = todayTx
            .filter(tx => tx.category === c.category)
            .reduce((s, tx) => s + tx.amount, 0);
          const remaining = Math.max(0, c.dailyBudgetLeft - todayInCat);
          const pct = Math.min((todayInCat / c.dailyBudgetLeft) * 100, 100) || 0;

          return (
            <div key={c.category} className="home-cat-row">
              <div className="home-cat-top">
                <span className="home-cat-name" style={{ color: CAT_COLORS[c.category] }}>
                  {c.category}
                </span>
                <span className="home-cat-remaining">€{remaining.toFixed(2)} left</span>
              </div>
              <div className="progress-bar-wrap">
                <div
                  className={`progress-bar-fill ${c.isReasonable === false ? 'over' : ''}`}
                  style={{ width: `${pct}%`, background: CAT_COLORS[c.category] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's transactions */}
      {todayTx.length > 0 && (
        <div className="card">
          <div className="card-title">logged today</div>
          {todayTx.map((tx, i) => (
            <div key={i} className="tx-row">
              <span className="tx-cat" style={{ color: CAT_COLORS[tx.category] }}>{tx.category}</span>
              <span className="tx-desc">{tx.description || '—'}</span>
              <span className="tx-amount">-€{tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {todayTx.length === 0 && (
        <div className="empty-state">Nothing logged yet today</div>
      )}
    </div>
  );
}

// ─── Component: Month View ────────────────────────────────────────────────────
function MonthView({ stats, type }) {
  if (!stats) return <div className="loading-state">Loading...</div>;

  const { categoryStats, totalMonthly, totalSpent, daysRemaining, dayOfMonth, daysInMonth } = stats;

  return (
    <div className="month-view">
      {/* Overall */}
      <div className="card overall-card">
        <div className="overall-row">
          <div>
            <div className="overall-spent">€{totalSpent.toFixed(2)}</div>
            <div className="overall-sub">spent of €{totalMonthly.toFixed(2)}</div>
          </div>
          <div className="overall-right">
            <div className="days-left">{daysRemaining}d left</div>
            <div className="overall-sub">day {dayOfMonth}/{daysInMonth}</div>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div
            className="progress-bar-fill overall"
            style={{ width: `${Math.min((totalSpent/totalMonthly)*100, 100)}%` }}
          />
        </div>
      </div>

      {/* Per category */}
      <div className="cat-list">
        {categoryStats.map(c => (
          <div key={c.category} className="cat-card">
            <div className="cat-card-top">
              <span className="cat-name" style={{ color: CAT_COLORS[c.category] }}>{c.category}</span>
              <Badge ok={c.isReasonable} />
            </div>
            <div className="cat-card-mid">
              <span className="cat-spent">€{c.spentSoFar.toFixed(2)}</span>
              <span className="cat-budget"> / €{c.monthlyBudget.toFixed(2)}</span>
            </div>
            <div className="progress-bar-wrap">
              <div
                className={`progress-bar-fill ${c.isReasonable === false ? 'over' : ''}`}
                style={{
                  width: `${Math.min(c.percentUsed * 100, 100)}%`,
                  background: CAT_COLORS[c.category],
                }}
              />
            </div>
            <div className="cat-card-bot">
              <span>€{c.dailyBudgetLeft.toFixed(2)}/day left</span>
              <span>{(c.percentUsed * 100).toFixed(0)}% used</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [apiReady, setApiReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState('today');
  const [type, setType] = useState('Personal');
  const [transactions, setTransactions] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Init Google API
  useEffect(() => {
    initGoogleAPI()
      .then(() => {
        setApiReady(true);
        setSignedIn(isSignedIn());
      })
      .catch(e => setError('Failed to load Google API. Check your Client ID.'));
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [b, tx] = await Promise.all([fetchBudgets(), fetchTransactions()]);
      setBudgets(b);
      setTransactions(tx);
    } catch (e) {
      setError('Failed to load data: ' + e.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) loadData();
  }, [signedIn, loadData]);

  const handleSignIn = async () => {
    try {
      await signIn();
      setSignedIn(true);
    } catch (e) {
      setError('Sign in failed.');
    }
  };

  const handleSignOut = () => {
    signOut();
    setSignedIn(false);
    setTransactions(null);
    setBudgets(null);
  };

  const handleAdd = async (data) => {
    setAddLoading(true);
    try {
      await appendTransaction(data);
      await loadData(); // refresh
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setAddLoading(false);
    }
  };

  const stats = useBudgetStats(transactions, budgets, type);

  // ── Render: not ready ──
  if (!apiReady) {
    return (
      <div className="splash">
        <div className="splash-logo">💸</div>
        <div className="splash-text">Loading...</div>
      </div>
    );
  }

  // ── Render: sign in ──
  if (!signedIn) {
    return (
      <div className="splash">
        <div className="splash-logo">💸</div>
        <h1 className="splash-title">Budget</h1>
        <p className="splash-sub">Your spending, actually under control.</p>
        {error && <div className="error-msg">{error}</div>}
        <button className="signin-btn" onClick={handleSignIn}>
          Sign in with Google
        </button>
      </div>
    );
  }

  // ── Render: main app ──
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <span className="header-title">💸 Budget</span>
        <div className="header-right">
          {/* Type switcher */}
          <div className="type-mini-toggle">
            {TYPES.map(t => (
              <button
                key={t}
                className={`type-mini-btn ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {t === 'Personal' ? '👤' : '👥'}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={handleSignOut} title="Sign out"><LogoutIcon /></button>
        </div>
      </header>

      {error && <div className="error-banner" onClick={() => setError(null)}>{error} ✕</div>}

      {/* Content */}
      <main className="app-main">
        {dataLoading && <div className="refresh-bar">Syncing...</div>}
        {tab === 'add'   && <QuickAdd onAdd={handleAdd} loading={addLoading} />}
        {tab === 'today' && <TodayView stats={stats} type={type} />}
        {tab === 'month' && <MonthView stats={stats} type={type} />}
      </main>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <PlusIcon /><span>Add</span>
        </button>
        <button className={`nav-btn ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <TodayIcon /><span>Today</span>
        </button>
        <button className={`nav-btn ${tab === 'month' ? 'active' : ''}`} onClick={() => setTab('month')}>
          <ChartIcon /><span>Month</span>
        </button>
      </nav>
    </div>
  );
}
