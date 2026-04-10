import { useState, useCallback, useEffect } from 'react';

const COLORS = ['#378ADD', '#1D9E75', '#D4537E', '#BA7517', '#888780'];

const DEFAULT_BUDGETS = {
  personal: { Groceries: 129.25, Other: 77.55, Outings: 155.10, Shopping: 155.10, Travel: 0 },
  couple:   { Groceries: 200, Other: 100, Outings: 250, Shopping: 180, Travel: 300 },
};

export default function BudgetEditor({ budgets: externalBudgets, onSave }) {
  const [currentType, setCurrentType] = useState('personal');
  const [localBudgets, setLocalBudgets] = useState(() => externalBudgets || DEFAULT_BUDGETS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (externalBudgets) setLocalBudgets(externalBudgets);
  }, [externalBudgets]);

  const categories = Object.keys(localBudgets[currentType]);
  const total = Object.values(localBudgets[currentType]).reduce((a, b) => a + b, 0);

  const handleUpdate = useCallback((cat, val) => {
    const num = parseFloat(val) || 0;
    setLocalBudgets(prev => ({
      ...prev,
      [currentType]: { ...prev[currentType], [cat]: num },
    }));
  }, [currentType]);

  const handleSave = () => {
    onSave?.(localBudgets);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getPct = (val) => total > 0 ? ((val / total) * 100).toFixed(0) : 0;

  return (
    <div style={{ padding: '1rem 0', maxWidth: 480, fontFamily: 'var(--font-sans)' }}>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
        {['personal', 'couple'].map(type => (
          <button
            key={type}
            onClick={() => setCurrentType(type)}
            style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500,
              border: `0.5px solid var(${currentType === type ? '--color-border-primary' : '--color-border-secondary'})`,
              borderRadius: 'var(--border-radius-md)',
              background: currentType === type ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
              color: currentType === type ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Total card */}
      <div style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          total monthly budget
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12 }}>
          €{total.toFixed(2)}
        </div>

        {/* Stacked bar */}
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
          {categories.map((cat, i) => {
            const val = localBudgets[currentType][cat];
            const pct = total > 0 ? (val / total) * 100 : 0;
            return pct > 0 ? (
              <div
                key={cat}
                style={{
                  flex: pct, height: '100%', borderRadius: 2,
                  background: COLORS[i % COLORS.length],
                  transition: 'flex 0.3s ease',
                  minWidth: 2,
                }}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
          {categories.map((cat, i) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              {cat} {getPct(localBudgets[currentType][cat])}%
            </div>
          ))}
        </div>
      </div>

      {/* Category inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
        {categories.map((cat, i) => {
          const val = localBudgets[currentType][cat];
          return (
            <div
              key={cat}
              style={{
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>{cat}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 38, textAlign: 'right' }}>
                {getPct(val)}%
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: 'var(--color-text-secondary)', pointerEvents: 'none',
                }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={val}
                  onChange={e => handleUpdate(cat, e.target.value)}
                  style={{
                    width: 90, padding: '6px 8px 6px 20px',
                    fontSize: 14, fontWeight: 500,
                    border: '0.5px solid var(--color-border-secondary)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: 12,
          fontSize: 14, fontWeight: 500,
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 'var(--border-radius-md)',
          background: 'var(--color-background-primary)',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
        }}
      >
        Save budgets
      </button>

      {saved && (
        <div style={{ fontSize: 13, color: 'var(--color-text-success)', textAlign: 'center', marginTop: 10 }}>
          Budgets saved
        </div>
      )}
    </div>
  );
}
