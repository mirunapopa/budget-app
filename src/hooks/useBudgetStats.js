import { useMemo } from 'react';

export function useBudgetStats(transactions, budgets, type = 'Personal') {
  return useMemo(() => {
    if (!budgets || !transactions) return null;

    const now = new Date();
    const currentMonthStr = `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const todayStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

    // Days in month & days remaining
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = daysInMonth - dayOfMonth + 1;

    const budgetMap = type === 'Personal' ? budgets.personal : budgets.couple;
    const rawThreshold = budgets.variabilityThreshold || 0.20;
    const threshold = rawThreshold > 1 ? rawThreshold / 100 : rawThreshold;

    // Filter to current month + type
    const monthTx = transactions.filter(tx => {
      if (!tx.date) return false;
      const [d, m, y] = tx.date.split('/');
      const txMonth = `${m}/${y}`;
      return txMonth === currentMonthStr && tx.type === type;
    });

    // Today's transactions
    const todayTx = monthTx.filter(tx => tx.date === todayStr);
    const todayTotal = todayTx.reduce((s, tx) => s + tx.amount, 0);

    // Per-category stats
    const categories = Object.keys(budgetMap);
    const categoryStats = categories.map(cat => {
      const monthlyBudget = budgetMap[cat] || 0;
      const dailyBudgetAtStart = monthlyBudget / daysInMonth;
      const spentSoFar = monthTx.filter(tx => tx.category === cat).reduce((s, tx) => s + tx.amount, 0);
      const budgetLeft = monthlyBudget - spentSoFar;
      const dailyBudgetLeft = daysRemaining > 0 ? budgetLeft / daysRemaining : 0;
      const percentUsed = monthlyBudget > 0 ? spentSoFar / monthlyBudget : 0;

      // Reasonable check: daily budget left within threshold of initial daily budget
      const deviation = dailyBudgetAtStart > 0
        ? (dailyBudgetAtStart - dailyBudgetLeft) / dailyBudgetAtStart
        : 0;
      const isReasonable = monthlyBudget === 0 ? null : deviation <= threshold;

      return {
        category: cat,
        monthlyBudget,
        dailyBudgetAtStart,
        spentSoFar,
        budgetLeft,
        dailyBudgetLeft,
        percentUsed,
        isReasonable,
      };
    });

    const totalMonthly = categories.reduce((s, c) => s + (budgetMap[c] || 0), 0);
    const totalSpent = categoryStats.reduce((s, c) => s + c.spentSoFar, 0);
    const overallReasonable = categoryStats.every(c => c.isReasonable !== false);

    return {
      todayTotal,
      todayTx,
      categoryStats,
      totalMonthly,
      totalSpent,
      overallReasonable,
      daysRemaining,
      dayOfMonth,
      daysInMonth,
    };
  }, [transactions, budgets, type]);
}