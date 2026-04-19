import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { Account, WeeklySnapshot } from '../types';

dayjs.extend(isoWeek);

export function getWeekStart(date: dayjs.Dayjs = dayjs()): string {
  // Keep legacy field name `weekStart`, but persist the user-selected snapshot date.
  return date.format('YYYY-MM-DD');
}

export function calculateTotals(account: Account) {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const cat of account.categories) {
    const sum = cat.groups.reduce(
      (acc, g) => acc + g.items.reduce((a, item) => a + item.amount, 0),
      0
    );
    if (cat.type === 'asset') totalAssets += sum;
    else totalLiabilities += sum;
  }

  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

export function takeSnapshot(account: Account, date?: dayjs.Dayjs): WeeklySnapshot {
  const { totalAssets, totalLiabilities, netWorth } = calculateTotals(account);
  return {
    weekStart: getWeekStart(date),
    totalAssets,
    totalLiabilities,
    netWorth,
    categories: JSON.parse(JSON.stringify(account.categories)),
  };
}

export function createManualSnapshot(
  weekStart: string,
  totalAssets: number,
  totalLiabilities: number
): WeeklySnapshot {
  return {
    weekStart,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

export function upsertSnapshot(snapshots: WeeklySnapshot[], newSnap: WeeklySnapshot): WeeklySnapshot[] {
  const idx = snapshots.findIndex((s) => s.weekStart === newSnap.weekStart);
  if (idx >= 0) {
    const updated = [...snapshots];
    updated[idx] = newSnap;
    return updated;
  }
  return [...snapshots, newSnap].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
