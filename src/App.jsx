import { useState, useEffect, useCallback } from 'react';
import { initGoogleAPI, isSignedIn, signIn, signOut, trySilentSignIn, fetchBudgets, fetchTransactions, appendTransaction } from './api/sheets.js';
import { useBudgetStats } from './hooks/useBudgetStats.js';
import { CATEGORIES, TYPES } from './config.js';

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
const HomeIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CAT_COLORS = {
  Groceries: '#4ade80',
  Outings:   '#fb923c',
  Shopping:  '#a78bfa',
  Other:     '#60a5fa',
  Travel:    '#f472b6',
};

// Badge reflects monthly reasonability (variability threshold logic)
function Badge({ ok }) {
  if (ok === null) return <span className="badge neutral">–</span>;
  return <span className={`badge ${ok ? 'yes' : 'no'}`}>{ok ? 'on track' : 'slow down'}</span>;
}

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
    setCategory(''); setAmount(''); setDescription('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="quick-add">
      {submitted && <div className="toast">Added!</div>}
      <div className="type-toggle">
        {TYPES.map(t => (
          <button key={t} className={`type-btn ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
            {t === 'Personal' ? '👤' : '👥'} {t}
          </button>
        ))}
      </div>
      <div className="section-label">Category</div>
      <div className="cat-grid">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-chip ${category === cat ? 'active' : ''}`}
            style={{ '--cat-color': CAT_COLORS[cat] }}
            onClick={() => setCategory(cat)}
          >{cat}</button>
        ))}
      </div>
      <div className="section-label">Amount (€)</div>
      <input className="amount-input" type="number" inputMode="decimal" placeholder="0.00"
        value={amount} onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      <div className="section-label">Description <span className="optional">(optional)</span></div>
      <input className="desc-input" type="text" placeholder="Lidl, coffee, cinema..."
        value={description} onChange={e => setDescription(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      <button className={`submit-btn ${canSubmit ? 'ready' : ''} ${loading ? 'loading' : ''}`}
        onClick={handleSubmit} disabled={!canSubmit}>
        {loading ? 'Saving...' : 'Add Expense'}
      </button>
    </div>
  );
}

function HomeView({ stats }) {
  if (!stats) return <div className="loading-state">Loading...</div>;

  const { todayTotal, todayTx, overallReasonable, categoryStats } = stats;

  // Total daily budget available today (sum of each category's daily budget for remaining month)
  const totalDailyBudget = categoryStats
    .filter(c => c.monthlyBudget > 0)
    .reduce((s, c) => s + c.dailyBudgetLeft, 0);

  const remaining = totalDailyBudget - todayTotal;
  const canStillSpend = Math.max(0, remaining);
  const isTodayOver = remaining < 0;

  return (
    <div className="today-view">
      {/* Hero — today's remaining spend */}
      <div className={`today-hero ${isTodayOver ? 'hero-over' : ''}`}>
        <div className="hero-label">
          {isTodayOver ? 'over budget today' : 'you can still spend today'}
        </div>
        <div className={`hero-amount ${isTodayOver ? 'over' : ''}`}>
          {isTodayOver ? '-' : ''}€{isTodayOver ? Math.abs(remaining).toFixed(2) : canStillSpend.toFixed(2)}
        </div>
        <div className="hero-meta">
          <span className="hero-meta-item">
            <span className="hero-meta-label">daily budget</span>
            <span className="hero-meta-value">€{totalDailyBudget.toFixed(2)}</span>
          </span>
          <span className="hero-divider">·</span>
          <span className="hero-meta-item">
            <span className="hero-meta-label">spent today</span>
            <span className="hero-meta-value">€{todayTotal.toFixed(2)}</span>
          </span>
          <span className="hero-divider">·</span>
          {/* Badge reflects MONTHLY reasonability, not today's spend */}
          <Badge ok={overallReasonable} />
        </div>
      </div>

      {/* Per-category: daily budget left, with monthly badge */}
      <div className="card">
        <div className="card-title">daily budget left per category</div>
        {categoryStats.filter(c => c.monthlyBudget > 0).map(c => {
          const spentTodayInCat = todayTx
            .filter(tx => tx.category === c.category)
            .reduce((s, tx) => s + tx.amount, 0);
          const remainingToday = c.dailyBudgetLeft - spentTodayInCat;
          const isCatOver = remainingToday < 0;
          const pct = c.dailyBudgetLeft > 0
            ? Math.min((spentTodayInCat / c.dailyBudgetLeft) * 100, 100) : 0;
          return (
            <div key={c.category} className="home-cat-row">
              <div className="home-cat-top">
                <span className="home-cat-name" style={{ color: CAT_COLORS[c.category] }}>{c.category}</span>
                <div className="home-cat-right">
                  <span className={`home-cat-remaining ${isCatOver ? 'over-text' : ''}`}>
                    {isCatOver
                      ? `−€${Math.abs(remainingToday).toFixed(2)} over`
                      : `€${remainingToday.toFixed(2)} left`}
                  </span>
                  {/* Monthly reasonability badge */}
                  <Badge ok={c.isReasonable} />
                </div>
              </div>
              <div className="progress-bar-wrap">
                <div
                  className={`progress-bar-fill ${isCatOver ? 'over' : ''}`}
                  style={{ width: `${pct}%`, background: isCatOver ? 'var(--danger)' : CAT_COLORS[c.category] }}
                />
              </div>
            </div>
          );
        })}
      </div>

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
      {todayTx.length === 0 && <div className="empty-state">Nothing logged yet today</div>}
    </div>
  );
}

function MonthView({ stats }) {
  if (!stats) return <div className="loading-state">Loading...</div>;
  const { categoryStats, totalMonthly, totalSpent, daysRemaining, dayOfMonth, daysInMonth } = stats;
  const totalLeft = totalMonthly - totalSpent;

  return (
    <div className="month-view">
      {/* Overall: how much is LEFT, not spent */}
      <div className="card overall-card">
        <div className="overall-row">
          <div>
            <div className="overall-spent" style={{ color: totalLeft < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              €{Math.abs(totalLeft).toFixed(2)}
            </div>
            <div className="overall-sub">
              {totalLeft < 0 ? 'over budget' : 'left this month'} · €{totalMonthly.toFixed(2)} total
            </div>
          </div>
          <div className="overall-right">
            <div className="days-left">{daysRemaining}d left</div>
            <div className="overall-sub">day {dayOfMonth}/{daysInMonth}</div>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill overall"
            style={{ width: `${Math.min((totalSpent/totalMonthly)*100, 100)}%` }} />
        </div>
      </div>

      {/* Per category: budget left as main number */}
      <div className="cat-list">
        {categoryStats.map(c => {
          const left = c.budgetLeft;
          const isOver = left < 0;
          return (
            <div key={c.category} className="cat-card">
              <div className="cat-card-top">
                <span className="cat-name" style={{ color: CAT_COLORS[c.category] }}>{c.category}</span>
                <Badge ok={c.isReasonable} />
              </div>
              <div className="cat-card-mid">
                <span className="cat-spent" style={{ color: isOver ? 'var(--danger)' : 'var(--text)' }}>
                  {isOver ? '-' : ''}€{Math.abs(left).toFixed(2)}
                </span>
                <span className="cat-budget">
                  {isOver ? ' over' : ' left'} · €{c.monthlyBudget.toFixed(2)} budget
                </span>
              </div>
              <div className="progress-bar-wrap">
                <div
                  className={`progress-bar-fill ${isOver || c.isReasonable === false ? 'over' : ''}`}
                  style={{ width: `${Math.min(c.percentUsed * 100, 100)}%`, background: isOver ? 'var(--danger)' : CAT_COLORS[c.category] }}
                />
              </div>
              <div className="cat-card-bot">
                <span>€{c.dailyBudgetLeft.toFixed(2)}/day for {daysRemaining}d</span>
                <span>{(c.percentUsed * 100).toFixed(0)}% used</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [apiReady, setApiReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState('home');
  const [type, setType] = useState('Personal');
  const [transactions, setTransactions] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initGoogleAPI()
      .then(async () => {
        setApiReady(true);
        if (isSignedIn()) { setSignedIn(true); }
        else { const ok = await trySilentSignIn(); setSignedIn(ok); }
      })
      .catch(() => setError('Failed to load Google API. Check your Client ID.'));
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [b, tx] = await Promise.all([fetchBudgets(), fetchTransactions()]);
      setBudgets(b); setTransactions(tx);
    } catch (e) { setError('Failed to load data: ' + e.message); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (signedIn) loadData(); }, [signedIn, loadData]);

  const handleSignIn = async () => {
    try { await signIn(); setSignedIn(true); }
    catch (e) { setError('Sign in failed.'); }
  };

  const handleSignOut = () => {
    signOut(); setSignedIn(false); setTransactions(null); setBudgets(null);
  };

  const handleAdd = async (data) => {
    setAddLoading(true);
    try { await appendTransaction(data); await loadData(); setTab('home'); }
    catch (e) { setError('Failed to save: ' + e.message); }
    finally { setAddLoading(false); }
  };

  const stats = useBudgetStats(transactions, budgets, type);

  if (!apiReady) return (
    <div className="splash">
      <div className="splash-logo">$</div>
      <div className="splash-text">Loading...</div>
    </div>
  );

  if (!signedIn) return (
    <div className="splash">
      <div className="splash-logo">$</div>
      <h1 className="splash-title">Budget</h1>
      <p className="splash-sub">Your spending, actually under control.</p>
      {error && <div className="error-msg">{error}</div>}
      <button className="signin-btn" onClick={handleSignIn}>Sign in with Google</button>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-title">Budget</span>
        <div className="header-right">
          <div className="type-mini-toggle">
            {TYPES.map(t => (
              <button key={t} className={`type-mini-btn ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
                {t === 'Personal' ? '👤' : '👥'}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={handleSignOut} title="Sign out"><LogoutIcon /></button>
        </div>
      </header>

      {error && <div className="error-banner" onClick={() => setError(null)}>{error} ✕</div>}

      <main className="app-main">
        {dataLoading && <div className="refresh-bar">Syncing...</div>}
        {tab === 'home'  && <HomeView stats={stats} type={type} />}
        {tab === 'add'   && <QuickAdd onAdd={handleAdd} loading={addLoading} />}
        {tab === 'month' && <MonthView stats={stats} type={type} />}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-btn ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <HomeIcon /><span>Today</span>
        </button>
        <button className={`nav-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <PlusIcon /><span>Add</span>
        </button>
        <button className={`nav-btn ${tab === 'month' ? 'active' : ''}`} onClick={() => setTab('month')}>
          <ChartIcon /><span>Month</span>
        </button>
      </nav>
    </div>
  );
}
