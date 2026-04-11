import { useState, useCallback, useEffect } from 'react';

const CAT_COLORS = {
  Groceries: '#4ade80',
  Outings:   '#fb923c',
  Shopping:  '#a78bfa',
  Other:     '#60a5fa',
  Travel:    '#f472b6',
};

const CATEGORIES = ['Groceries', 'Outings', 'Shopping', 'Other', 'Travel'];

const DEFAULT_BUDGETS = {
  personal: { Groceries: 129.25, Outings: 155.10, Shopping: 155.10, Other: 77.55, Travel: 0 },
  couple:   { Groceries: 200,    Outings: 250,     Shopping: 180,    Other: 100,   Travel: 300 },
};

const PersonIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
  </svg>
);

const CoupleIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="9" cy="8" r="3.5"/>
    <circle cx="17" cy="8" r="3.5"/>
    <path d="M2 20c0-3.5 3-6 7-6" strokeLinecap="round"/>
    <path d="M22 20c0-3.5-3-6-7-6" strokeLinecap="round"/>
    <path d="M9 14c1-.4 2-.6 3.5-.6s2.5.2 3.5.6" strokeLinecap="round"/>
  </svg>
);

function getTotal(budgets, type) {
  return Object.values(budgets[type]).reduce((a, b) => a + b, 0);
}

function sliderBg(color, pct) {
  return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #1e1e1e ${pct}%, #1e1e1e 100%)`;
}

export default function BudgetEditor({ budgets: externalBudgets, onSave }) {
  const [currentType, setCurrentType] = useState('personal');
  const [localBudgets, setLocalBudgets] = useState(() => externalBudgets || DEFAULT_BUDGETS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (externalBudgets) setLocalBudgets(externalBudgets);
  }, [externalBudgets]);

  const total = getTotal(localBudgets, currentType);

  const getPct = useCallback((cat) => {
    return total > 0 ? (localBudgets[currentType][cat] / total) * 100 : 0;
  }, [localBudgets, currentType, total]);

  const onTotalChange = useCallback((val) => {
    const newTotal = parseFloat(val) || 0;
    const oldTotal = getTotal(localBudgets, currentType);
    setLocalBudgets(prev => {
      const updated = { ...prev[currentType] };
      if (oldTotal === 0) {
        const even = newTotal / CATEGORIES.length;
        CATEGORIES.forEach(c => updated[c] = parseFloat(even.toFixed(2)));
      } else {
        const ratio = newTotal / oldTotal;
        CATEGORIES.forEach(c => updated[c] = parseFloat((prev[currentType][c] * ratio).toFixed(2)));
      }
      return { ...prev, [currentType]: updated };
    });
  }, [localBudgets, currentType]);

  const onAmountChange = useCallback((cat, val) => {
    const num = parseFloat(val) || 0;
    setLocalBudgets(prev => ({
      ...prev,
      [currentType]: { ...prev[currentType], [cat]: num },
    }));
  }, [currentType]);

  const onPctChange = useCallback((cat, val) => {
    const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
    const newAmt = parseFloat(((pct / 100) * total).toFixed(2));
    setLocalBudgets(prev => ({
      ...prev,
      [currentType]: { ...prev[currentType], [cat]: newAmt },
    }));
  }, [currentType, total]);

  const handleSave = () => {
    onSave?.(localBudgets);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const s = {
    wrap: {
      padding: '20px 0 40px',
      fontFamily: "'DM Sans', sans-serif",
    },
    typeToggle: {
      display: 'flex', gap: 10, marginBottom: 24,
    },
    typeBtn: (active) => ({
      flex: 1, padding: 14, borderRadius: 14,
      border: `2px solid ${active ? '#4ade80' : '#2a2a2a'}`,
      background: active ? 'rgba(74,222,128,0.08)' : '#1e1e1e',
      color: active ? '#4ade80' : '#888',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 15, fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all 0.15s',
    }),
    card: {
      background: '#161616', borderRadius: 20,
      padding: 20, border: '1px solid #222', marginBottom: 16,
    },
    cardLabel: {
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px',
      color: '#888', marginBottom: 12,
    },
    totalRow: {
      display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16,
    },
    totalEuro: {
      fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 500, color: '#888',
    },
    totalInput: {
      fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 500, color: '#4ade80',
      background: 'none', border: 'none', borderBottom: '1.5px solid #2a2a2a',
      outline: 'none', width: '100%', minWidth: 0, paddingBottom: 2,
    },
    stackBar: {
      display: 'flex', height: 6, borderRadius: 3,
      overflow: 'hidden', gap: 2, marginBottom: 10,
    },
    legend: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' },
    legendDot: (color) => ({ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }),
    sectionLabel: {
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px',
      color: '#888', marginBottom: 10, fontWeight: 500,
    },
    catList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
    catCard: {
      background: '#161616', border: '1px solid #222', borderRadius: 16, padding: 16,
    },
    catHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
    },
    catName: (color) => ({ fontSize: 14, fontWeight: 500, color }),
    pctBadge: {
      fontFamily: "'DM Mono', monospace", fontSize: 12,
      background: '#1e1e1e', border: '1px solid #2a2a2a',
      borderRadius: 100, padding: '3px 10px', color: '#888',
    },
    catInputs: { display: 'flex', gap: 8, marginBottom: 10 },
    inputField: (narrow) => ({
      flex: narrow ? '0 0 80px' : 1,
      background: '#1e1e1e', border: '1px solid #2a2a2a',
      borderRadius: 10, display: 'flex', alignItems: 'center',
      gap: 4, padding: '8px 12px',
    }),
    inputPrefix: {
      fontSize: 13, color: '#555', fontFamily: "'DM Mono', monospace",
    },
    input: {
      background: 'none', border: 'none', outline: 'none',
      color: '#f0f0f0', fontFamily: "'DM Mono', monospace",
      fontSize: 15, fontWeight: 500, width: '100%', minWidth: 0, textAlign: 'right',
    },
    saveBtn: {
      width: '100%', padding: 16, borderRadius: 14, border: 'none',
      fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
      cursor: 'pointer', background: '#4ade80', color: '#0d0d0d', transition: 'all 0.2s',
    },
    savedMsg: {
      textAlign: 'center', fontSize: 13, color: '#4ade80',
      marginTop: 10, fontFamily: "'DM Mono', monospace",
    },
  };

  return (
    <div style={s.wrap}>

      {/* Type toggle */}
      <div style={s.typeToggle}>
        {[['personal', <PersonIcon />], ['couple', <CoupleIcon />]].map(([type, icon]) => (
          <button
            key={type}
            onClick={() => setCurrentType(type)}
            style={s.typeBtn(currentType === type)}
          >
            {icon}
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Total card */}
      <div style={s.card}>
        <div style={s.cardLabel}>total monthly budget</div>
        <div style={s.totalRow}>
          <span style={s.totalEuro}>€</span>
          <input
            style={s.totalInput}
            type="number"
            step="1"
            value={total.toFixed(2)}
            onChange={e => onTotalChange(e.target.value)}
            onFocus={e => e.target.select()}
          />
        </div>

        {/* Stacked bar */}
        <div style={s.stackBar}>
          {CATEGORIES.map(cat => {
            const pct = getPct(cat);
            return pct > 0 ? (
              <div key={cat} style={{
                flex: pct, height: '100%', borderRadius: 2,
                background: CAT_COLORS[cat], transition: 'flex 0.3s ease', minWidth: 2,
              }} />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div style={s.legend}>
          {CATEGORIES.map(cat => (
            <div key={cat} style={s.legendItem}>
              <div style={s.legendDot(CAT_COLORS[cat])} />
              {cat} {getPct(cat).toFixed(0)}%
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={s.sectionLabel}>categories</div>
      <div style={s.catList}>
        {CATEGORIES.map(cat => {
          const val = localBudgets[currentType][cat];
          const pct = getPct(cat);
          const color = CAT_COLORS[cat];
          return (
            <div key={cat} style={s.catCard}>
              <div style={s.catHeader}>
                <span style={s.catName(color)}>{cat}</span>
                <span style={s.pctBadge}>{pct.toFixed(0)}%</span>
              </div>

              <div style={s.catInputs}>
                <div style={s.inputField(false)}>
                  <span style={s.inputPrefix}>€</span>
                  <input
                    style={s.input}
                    type="number" step="0.01" min="0"
                    value={val.toFixed(2)}
                    onChange={e => onAmountChange(cat, e.target.value)}
                    onFocus={e => e.target.select()}
                  />
                </div>
                <div style={s.inputField(true)}>
                  <input
                    style={s.input}
                    type="number" step="1" min="0" max="100"
                    value={pct.toFixed(0)}
                    onChange={e => onPctChange(cat, e.target.value)}
                    onFocus={e => e.target.select()}
                  />
                  <span style={s.inputPrefix}>%</span>
                </div>
              </div>

              <input
                type="range"
                min="0" max="100" step="0.1"
                value={pct.toFixed(1)}
                onChange={e => onPctChange(cat, e.target.value)}
                style={{
                  width: '100%', height: 4, borderRadius: 2, cursor: 'pointer',
                  WebkitAppearance: 'none', appearance: 'none', outline: 'none', border: 'none',
                  background: sliderBg(color, pct),
                  '--thumb-color': color,
                }}
              />
            </div>
          );
        })}
      </div>

      <button style={s.saveBtn} onClick={handleSave}>Save budgets</button>
      {saved && <div style={s.savedMsg}>✓ budgets saved</div>}
    </div>
  );
}
