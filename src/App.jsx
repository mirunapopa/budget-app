import { useState, useEffect, useCallback } from 'react';
import { initGoogleAPI, isSignedIn, signIn, signOut, trySilentSignIn, fetchBudgets, fetchTransactions, appendTransaction } from './api/sheets.js';
import { useBudgetStats } from './hooks/useBudgetStats.js';
import { CATEGORIES, TYPES } from './config.js';
import BudgetEditor from './BudgetEditor.jsx';

const BudgetsIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

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

  // Daily budget at month start vs now
  const totalDailyAtStart = totalMonthly / daysInMonth;
  const totalDailyNow = daysRemaining > 0 ? totalLeft / daysRemaining : 0;
  const dailyDrift = totalDailyNow - totalDailyAtStart;
  const dailyDriftPct = totalDailyAtStart > 0 ? (dailyDrift / totalDailyAtStart) * 100 : 0;

  // No-spend nudge: how many no-spend days needed to get daily back to original
  // If you do N no-spend days, remaining budget is spread over (daysRemaining - N) days
  // Target: totalLeft / (daysRemaining - N) = totalDailyAtStart
  // N = daysRemaining - totalLeft / totalDailyAtStart
  const noSpendDaysNeeded = totalDailyAtStart > 0
    ? Math.max(0, Math.ceil(daysRemaining - totalLeft / totalDailyAtStart))
    : 0;
  const isAhead = dailyDrift >= 0;
  const needsRecovery = !isAhead && noSpendDaysNeeded > 0;

  return (
    <div className="month-view">
      {/* Overall card */}
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
            style={{ width: `${Math.min((totalSpent / totalMonthly) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Daily budget summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">daily budget</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, color: isAhead ? 'var(--accent)' : 'var(--danger)' }}>
              €{Math.max(0, totalDailyNow).toFixed(2)}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>/day</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              started at €{totalDailyAtStart.toFixed(2)}/day
            </div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)',
            background: isAhead ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: isAhead ? 'var(--accent)' : 'var(--danger)',
          }}>
            {isAhead ? '+' : ''}{dailyDriftPct.toFixed(0)}% vs start
          </div>
        </div>

        {/* Where you should be vs where you are */}
        <div style={{ display: 'flex', gap: 8, marginBottom: needsRecovery ? 14 : 0 }}>
          <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>should have spent</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500 }}>
              €{Math.min((totalDailyAtStart * dayOfMonth), totalMonthly).toFixed(2)}
            </div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>actually spent</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500, color: totalSpent > totalDailyAtStart * dayOfMonth ? 'var(--danger)' : 'var(--accent)' }}>
              €{totalSpent.toFixed(2)}
            </div>
          </div>
        </div>

        {/* No-spend nudge */}
        {needsRecovery && (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>
              to get back on track
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {noSpendDaysNeeded === 1
                ? <>1 no-spend day would bring your daily back to <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>€{totalDailyAtStart.toFixed(2)}</span>.</>
                : <>{noSpendDaysNeeded} no-spend days over the next {daysRemaining}d would bring your daily back to <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>€{totalDailyAtStart.toFixed(2)}</span>.</>
              }
            </div>
          </div>
        )}
        {isAhead && (
          <div style={{
            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              You have <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>€{(totalDailyNow - totalDailyAtStart).toFixed(2)}/day</span> extra headroom compared to your original budget.
            </div>
          </div>
        )}
      </div>

      {/* Per category */}
      <div className="cat-list">
        {categoryStats.map(c => {
          const left = c.budgetLeft;
          const isOver = left < 0;
          const catDailyDrift = c.dailyBudgetLeft - c.dailyBudgetAtStart;
          const catDriftPct = c.dailyBudgetAtStart > 0 ? (catDailyDrift / c.dailyBudgetAtStart) * 100 : 0;
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
                <span style={{ color: c.isReasonable === false ? 'var(--danger)' : 'var(--text-muted)' }}>
                  €{c.dailyBudgetLeft.toFixed(2)}/day
                  {c.monthlyBudget > 0 && (
                    <span style={{ marginLeft: 4, color: catDriftPct <= 0 ? 'var(--danger)' : 'var(--accent)' }}>
                      ({catDriftPct > 0 ? '+' : ''}{catDriftPct.toFixed(0)}%)
                    </span>
                  )}
                </span>
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
        {tab === 'home'    && <HomeView stats={stats} type={type} />}
        {tab === 'add'     && <QuickAdd onAdd={handleAdd} loading={addLoading} />}
        {tab === 'month'   && <MonthView stats={stats} type={type} />}
        {tab === 'budgets' && <BudgetEditor budgets={budgets} onSave={setBudgets} />}
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
        <button className={`nav-btn ${tab === 'budgets' ? 'active' : ''}`} onClick={() => setTab('budgets')}>
          <BudgetsIcon /><span>Budgets</span>
        </button>
      </nav>
    </div>
  );
}
