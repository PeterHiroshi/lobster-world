import { memo } from 'react';
import { useWorldStore } from '../store/useWorldStore';

function BudgetBarInner() {
  const budget = useWorldStore((s) => s.budgetStatus);

  if (!budget) return null;

  const dailyPct = Math.min(100, (budget.dailyTokensUsed / budget.dailyTokensLimit) * 100);
  const sessionPct = Math.min(100, (budget.activeSessionTokens / budget.activeSessionLimit) * 100);

  const dailyColor = dailyPct >= 95 ? 'bg-red-500' : dailyPct >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  const sessionColor = sessionPct >= 95 ? 'bg-red-500' : sessionPct >= 80 ? 'bg-yellow-500' : 'bg-indigo-500';

  return (
    <div
      className="fixed bottom-4 left-4 z-30 panel-glass rounded-lg p-3 text-xs w-56"
      data-testid="budget-bar"
    >
      <div className="text-slate-400 font-medium mb-2">Budget</div>
      <div className="mb-2">
        <div className="flex justify-between text-slate-300 mb-0.5">
          <span>Daily</span>
          <span>{budget.dailyTokensUsed.toLocaleString()} / {budget.dailyTokensLimit.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${dailyColor} rounded-full transition-all`} style={{ width: `${dailyPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-slate-300 mb-0.5">
          <span>Session</span>
          <span>{budget.activeSessionTokens.toLocaleString()} / {budget.activeSessionLimit.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${sessionColor} rounded-full transition-all`} style={{ width: `${sessionPct}%` }} />
        </div>
      </div>
      <div className="mt-1 text-slate-500">
        Sessions: {budget.dailySessionsUsed} / {budget.dailySessionsLimit}
      </div>
    </div>
  );
}

export const BudgetBar = memo(BudgetBarInner);
