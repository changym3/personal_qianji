import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Unit = 'yuan' | 'wan';
export type Metric = 'netWorth' | 'totalAssets' | 'totalLiabilities';
export type TimeGroup = 'snapshot' | 'week' | 'month';
export type PresetKey = 'all' | '1m' | '3m' | '6m' | '1y' | 'custom';

/**
 * 家庭资产计入方式：
 * - exclude：不计入（家庭资产条目完全排除在统计之外）
 * - as-liability：计入负债（家庭资产总额视为一笔负债，增加 totalLiabilities）
 * - deduct-asset：从资产扣除（家庭资产总额作为负值资产，减少 totalAssets）
 * 后两种方式净资产结果相同，区别在于 totalAssets/totalLiabilities 的分配。
 */
export type FamilyAssetMode = 'exclude' | 'as-liability' | 'deduct-asset';

interface ChartSettings {
  unit: Unit;
  metric: Metric;
  timeGroup: TimeGroup;
  presetKey: PresetKey;
  familyAssetMode: FamilyAssetMode;
  setUnit: (v: Unit) => void;
  setMetric: (v: Metric) => void;
  setTimeGroup: (v: TimeGroup) => void;
  setPresetKey: (v: PresetKey) => void;
  setFamilyAssetMode: (v: FamilyAssetMode) => void;
}

export const useChartSettingsStore = create<ChartSettings>()(
  persist(
    (set) => ({
      unit: 'yuan',
      metric: 'netWorth',
      timeGroup: 'snapshot',
      presetKey: 'all',
      familyAssetMode: 'exclude',
      setUnit: (v) => set({ unit: v }),
      setMetric: (v) => set({ metric: v }),
      setTimeGroup: (v) => set({ timeGroup: v }),
      setPresetKey: (v) => set({ presetKey: v }),
      setFamilyAssetMode: (v) => set({ familyAssetMode: v }),
    }),
    { name: 'qianji-chart-settings' }
  )
);
