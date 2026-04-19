import { useState, useMemo } from 'react';
import { useChartSettingsStore } from '../../store/useChartSettingsStore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
} from 'recharts';
import {
  Typography,
  Empty,
  Tag,
  Segmented,
  DatePicker,
  Button,
  Popconfirm,
  Tooltip as AntTooltip,
  message,
} from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, RightCircleOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);
import { useAccountStore } from '../../store/useAccountStore';
import type { WeeklySnapshot, Category } from '../../types';
import SnapshotEditor from './SnapshotEditor';

const { RangePicker } = DatePicker;

const { Text } = Typography;

import type { Unit, Metric, TimeGroup, PresetKey, FamilyAssetMode } from '../../store/useChartSettingsStore';

const METRIC_LABELS: Record<Metric, string> = {
  netWorth: '净资产',
  totalAssets: '总资产',
  totalLiabilities: '总负债',
};

const METRIC_COLORS: Record<Metric, string> = {
  netWorth: '#1677ff',
  totalAssets: '#52c41a',
  totalLiabilities: '#ff7a45',
};

const fmtCurrency = (v: number, unit: Unit = 'yuan') => {
  const val = unit === 'wan' ? v / 10000 : v;
  const suffix = unit === 'wan' ? '万' : '';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
};

const fmtYAxis = (v: number, unit: Unit = 'yuan') => {
  const val = unit === 'wan' ? v / 10000 : v;
  if (unit === 'wan') return `${val.toFixed(0)}万`;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}万`;
  return v.toLocaleString('zh-CN');
};

interface SnapshotSummary {
  weekStart: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  changeAmount: number | null;
  changePercent: number | null;
  categories?: Category[];
  remark?: string;
}

type DateRange = [Dayjs | null, Dayjs | null] | null;

const PRESET_OPTIONS: { key: PresetKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '1m', label: '近一月' },
  { key: '3m', label: '近三月' },
  { key: '6m', label: '近半年' },
  { key: '1y', label: '近一年' },
  { key: 'custom', label: '自定义' },
];

function getPresetRange(key: PresetKey): DateRange {
  const now = dayjs();
  switch (key) {
    case '1m': return [now.subtract(1, 'month'), now];
    case '3m': return [now.subtract(3, 'month'), now];
    case '6m': return [now.subtract(6, 'month'), now];
    case '1y': return [now.subtract(1, 'year'), now];
    default: return null;
  }
}

function filterSnapshotsByRange(snapshots: WeeklySnapshot[], range: DateRange): WeeklySnapshot[] {
  const sorted = [...snapshots].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (!range || !range[0] || !range[1]) return sorted;
  const [start, end] = range;
  return sorted.filter((s) => {
    const d = dayjs(s.weekStart);
    return (d.isAfter(start.startOf('day')) || d.isSame(start.startOf('day'))) &&
           (d.isBefore(end.endOf('day')) || d.isSame(end.endOf('day')));
  });
}

function aggregateSnapshots(snapshots: WeeklySnapshot[], groupBy: TimeGroup): WeeklySnapshot[] {
  if (groupBy === 'snapshot') return snapshots;

  const bucketMap = new Map<string, WeeklySnapshot>();
  for (const snap of snapshots) {
    const d = dayjs(snap.weekStart);
    const key = groupBy === 'week'
      ? d.startOf('isoWeek').format('YYYY-MM-DD')
      : d.format('YYYY-MM');
    const existing = bucketMap.get(key);
    if (!existing || snap.weekStart >= existing.weekStart) {
      bucketMap.set(key, snap);
    }
  }

  return Array.from(bucketMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function calcSnapshotTotals(snap: WeeklySnapshot, mode: FamilyAssetMode): { totalAssets: number; totalLiabilities: number; netWorth: number } {
  if (!snap.categories) {
    return { totalAssets: snap.totalAssets, totalLiabilities: snap.totalLiabilities, netWorth: snap.netWorth };
  }

  // 分别统计：非家庭资产部分 + 家庭资产部分
  let baseAssets = 0;
  let baseLiabilities = 0;
  let familyAssetSum = 0;

  for (const cat of snap.categories) {
    for (const g of cat.groups) {
      for (const i of g.items) {
        if (i.excludeFromTotal) continue;
        if (i.isFamilyAsset) {
          if (cat.type === 'asset') familyAssetSum += i.amount;
        } else {
          if (cat.type === 'asset') baseAssets += i.amount;
          else baseLiabilities += i.amount;
        }
      }
    }
  }

  if (mode === 'exclude') {
    return { totalAssets: baseAssets, totalLiabilities: baseLiabilities, netWorth: baseAssets - baseLiabilities };
  }
  if (mode === 'as-liability') {
    // 家庭资产作为负债：totalLiabilities 增加，净资产 = 资产 - (负债 + 家庭资产)
    return {
      totalAssets: baseAssets,
      totalLiabilities: baseLiabilities + familyAssetSum,
      netWorth: baseAssets - baseLiabilities - familyAssetSum,
    };
  }
  // deduct-asset：家庭资产从资产中扣除（作为负值资产）
  return {
    totalAssets: baseAssets - familyAssetSum,
    totalLiabilities: baseLiabilities,
    netWorth: baseAssets - familyAssetSum - baseLiabilities,
  };
}

function buildSummaries(snapshots: WeeklySnapshot[], mode: FamilyAssetMode): SnapshotSummary[] {
  const computed = snapshots.map((snap) => ({ ...snap, ...calcSnapshotTotals(snap, mode) }));
  return computed
    .map((snap, idx) => {
      const prev = idx > 0 ? computed[idx - 1] : null;
      const changeAmount = prev ? snap.netWorth - prev.netWorth : null;
      const changePercent = prev && prev.netWorth !== 0
        ? ((snap.netWorth - prev.netWorth) / Math.abs(prev.netWorth)) * 100
        : null;

      return {
        weekStart: snap.weekStart,
        netWorth: snap.netWorth,
        totalAssets: snap.totalAssets,
        totalLiabilities: snap.totalLiabilities,
        changeAmount,
        changePercent,
        categories: snap.categories,
        remark: snap.remark,
      };
    })
    .reverse();
}

function SnapshotCard({ summary, onClick, unit, onDateChange, onDelete }: {
  summary: SnapshotSummary;
  onClick: () => void;
  unit: Unit;
  onDateChange: (oldWeekStart: string, newDate: Dayjs) => void;
  onDelete: (weekStart: string) => void;
}) {
  const { netWorth, totalAssets, totalLiabilities, changeAmount, changePercent, weekStart, remark } = summary;
  const isUp = changeAmount !== null && changeAmount >= 0;
  // 净资产占总资产的比例：蓝色=净资产，橙色=负债，基准为总资产
  const netWorthRatio = totalAssets > 0 ? Math.min(Math.max((netWorth / totalAssets) * 100, 0), 100) : 50;
  const dateLabel = dayjs(weekStart).format('YYYY年M月D日');
  const [editingDate, setEditingDate] = useState(false);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 20px',
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          paddingTop: 2, flexShrink: 0,
        }}>
          {editingDate ? (
            <div onClick={(e) => e.stopPropagation()}>
              <DatePicker
                size="small"
                defaultValue={dayjs(weekStart)}
                autoFocus
                open={editingDate}
                onOpenChange={(open) => {
                  if (!open) setEditingDate(false);
                }}
                onChange={(d) => {
                  if (d) {
                    onDateChange(weekStart, d);
                    setEditingDate(false);
                  }
                }}
                style={{ width: 130 }}
              />
            </div>
          ) : (
            <Tag
              color="blue"
              style={{ margin: 0, fontWeight: 600, fontSize: 14, padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setEditingDate(true); }}
            >
              {dateLabel} <EditOutlined style={{ fontSize: 12, marginLeft: 2 }} />
            </Tag>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 14 }}>净资产</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Popconfirm
                title="确定删除该资产卡片？"
                okText="删除"
                cancelText="取消"
                onConfirm={() => onDelete(weekStart)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ padding: 0, width: 24, height: 24 }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
              <RightCircleOutlined style={{ color: '#bbb', fontSize: 18 }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {fmtCurrency(netWorth, unit)}
            </span>
            {changePercent !== null && (
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: isUp ? '#52c41a' : '#ff4d4f',
                background: isUp ? '#f6ffed' : '#fff2f0',
                padding: '2px 10px', borderRadius: 10,
              }}>
                {Math.abs(changePercent).toFixed(1)}%
                {isUp ? <ArrowUpOutlined style={{ fontSize: 13, marginLeft: 2 }} /> : <ArrowDownOutlined style={{ fontSize: 13, marginLeft: 2 }} />}
              </span>
            )}
          </div>
          {changeAmount !== null && (
            <Text type="secondary" style={{ fontSize: 15 }}>
              相比上次快照{isUp ? '增长' : '减少'}{' '}
              <span style={{ color: isUp ? '#52c41a' : '#ff4d4f', fontWeight: 700, fontSize: 17 }}>
                {fmtCurrency(Math.abs(changeAmount), unit)}
              </span>
            </Text>
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>
                <Text type="secondary">总资产 </Text><Text strong>{fmtCurrency(totalAssets, unit)}</Text>
              </span>
              <span style={{ fontSize: 14 }}>
                <Text type="secondary">净资产 </Text><Text strong>{fmtCurrency(netWorth, unit)}</Text>
              </span>
              <span style={{ fontSize: 14 }}>
                <Text type="secondary">总负债 </Text><Text strong style={{ color: '#ff7a45' }}>-{fmtCurrency(totalLiabilities, unit)}</Text>
              </span>
            </div>
            <div style={{
              display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#f5f5f5',
            }}>
              <div style={{ width: `${netWorthRatio}%`, background: 'linear-gradient(90deg, #1677ff, #4096ff)', borderRadius: '3px 0 0 3px', transition: 'width 0.3s' }} />
              <div style={{ width: `${100 - netWorthRatio}%`, background: 'linear-gradient(90deg, #ffa940, #ff7a45)', borderRadius: '0 3px 3px 0', transition: 'width 0.3s' }} />
            </div>
          </div>
          {remark && (
            <div style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid #f5f5f5',
              fontSize: 13,
              color: '#888',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {remark}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddSnapshotCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '24px 20px',
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onClick={onAdd}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: '#1677ff',
        fontSize: 17,
      }}>
        <PlusOutlined style={{ fontSize: 20 }} />
        <span style={{ fontWeight: 500 }}>新增快照</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 6, fontSize: 14, color: '#999' }}>
        手动录入各项资产负债明细
      </div>
    </div>
  );
}

export default function TrendChart() {
  const { account, updateSnapshotDate, removeSnapshot } = useAccountStore();
  const data = account.snapshots;

  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange>(null);

  const {
    unit,
    metric, setMetric,
    timeGroup, setTimeGroup,
    presetKey, setPresetKey,
    familyAssetMode,
  } = useChartSettingsStore();

  const effectiveRange = useMemo(() => {
    if (presetKey === 'custom') return customRange;
    if (presetKey === 'all') return null;
    return getPresetRange(presetKey);
  }, [presetKey, customRange]);

  const filtered = useMemo(
    () => filterSnapshotsByRange(data, effectiveRange),
    [data, effectiveRange]
  );

  const aggregated = useMemo(
    () => aggregateSnapshots(filtered, timeGroup),
    [filtered, timeGroup]
  );

  const chartData = useMemo(() => {
    const years = new Set(aggregated.map((s) => dayjs(s.weekStart).year()));
    const crossYear = years.size > 1;
    return aggregated.map((s) => {
      const totals = calcSnapshotTotals(s, familyAssetMode);
      return {
        ...s,
        ...totals,
        label: crossYear ? s.weekStart.slice(2) : s.weekStart.slice(5),
      };
    });
  }, [aggregated, familyAssetMode]);

  // 动态 Y 轴范围：以数据实际 min/max 为基础，向外扩展 15% padding，凸显变化幅度
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length < 2) return undefined;
    const values = chartData.map((d) => d[metric] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    // 如果所有值完全相同，退回默认行为
    if (span === 0) return undefined;
    const pad = span * 0.15;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData, metric]);

  const snapshotSummaries = useMemo(() => buildSummaries(aggregated, familyAssetMode), [aggregated, familyAssetMode]);

  const selectedSummary = selectedWeek
    ? snapshotSummaries.find((s) => s.weekStart === selectedWeek)
    : null;

  const handleDateChange = (oldWeekStart: string, newDate: Dayjs) => {
    const newSnapshotDate = newDate.format('YYYY-MM-DD');
    if (newSnapshotDate === oldWeekStart) return;
    if (data.some((s) => s.weekStart === newSnapshotDate)) {
      message.warning('该日期已存在快照，请选择其他日期');
      return;
    }
    updateSnapshotDate(oldWeekStart, newSnapshotDate);
    message.success(`快照日期已更新为 ${newDate.format('YYYY-MM-DD')}`);
  };

  const handleDeleteSnapshot = (weekStart: string) => {
    removeSnapshot(weekStart);
    message.success('资产卡片已删除');
  };

  if (showEditor) {
    return (
      <SnapshotEditor
        onBack={() => setShowEditor(false)}
        onSaved={() => { setShowEditor(false); }}
      />
    );
  }

  if (selectedSummary) {
    return (
      <SnapshotEditor
        pageTitle="资产卡片详情页"
        snapshot={{ categories: selectedSummary.categories, weekStart: selectedSummary.weekStart, remark: selectedSummary.remark }}
        onBack={() => setSelectedWeek(null)}
        onSaved={() => { setSelectedWeek(null); }}
      />
    );
  }

  return (
    <div>
      {/* 配置 */}
      <div style={{ marginBottom: 18 }}>
        <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 10 }}>配置</Text>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '14px 16px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Text strong style={{ fontSize: 16 }}>聚合方式</Text>
              <AntTooltip
                title="按周 / 按月聚合时，仅保留该周期内最后一次快照的数据。"
                placement="right"
              >
                <InfoCircleOutlined style={{ fontSize: 13, color: '#aaa', cursor: 'help' }} />
              </AntTooltip>
            </div>
            <Segmented
              value={timeGroup}
              onChange={(v) => setTimeGroup(v as TimeGroup)}
              options={[
                { label: <span style={{ fontSize: 14 }}>快照</span>, value: 'snapshot' },
                { label: <span style={{ fontSize: 14 }}>按周</span>, value: 'week' },
                { label: <span style={{ fontSize: 14 }}>按月</span>, value: 'month' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Text strong style={{ fontSize: 16 }}>
              时间范围
            </Text>
            <Segmented
              value={presetKey}
              onChange={(v) => {
                const next = v as PresetKey;
                setPresetKey(next);
                if (next !== 'custom') setCustomRange(null);
              }}
              options={PRESET_OPTIONS.map((opt) => ({
                label: <span style={{ fontSize: 14 }}>{opt.label}</span>,
                value: opt.key,
              }))}
            />
          </div>
          {presetKey === 'custom' && (
            <RangePicker
              size="middle"
              style={{ width: '100%', marginBottom: 10 }}
              value={customRange as [Dayjs, Dayjs] | undefined}
              onChange={(dates) => setCustomRange(dates as DateRange)}
              placeholder={['开始日期', '结束日期']}
            />
          )}
        </div>
      </div>

      {/* 资产趋势 */}
      <div style={{ marginBottom: 18 }}>
        <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 10 }}>
          资产趋势
        </Text>
        <div style={{ paddingBottom: 12 }}>
          <Segmented
            value={metric}
            onChange={(v) => setMetric(v as Metric)}
            options={[
              { label: <span style={{ fontSize: 14 }}>净资产</span>, value: 'netWorth' },
              { label: <span style={{ fontSize: 14 }}>总资产</span>, value: 'totalAssets' },
              { label: <span style={{ fontSize: 14 }}>总负债</span>, value: 'totalLiabilities' },
            ]}
          />
        </div>

        {/* Area Chart */}
        {chartData.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 0 0' }}>
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 11 }} tickFormatter={(v) => fmtYAxis(v, unit)} width={58} domain={yDomain} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: '8px 12px' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: '10px 14px', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: METRIC_COLORS.netWorth, display: 'inline-block' }} />
                          <span>净资产：</span><span style={{ fontWeight: 600 }}>{fmtCurrency(d.netWorth, unit)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: METRIC_COLORS.totalAssets, display: 'inline-block' }} />
                          <span>总资产：</span><span style={{ fontWeight: 600 }}>{fmtCurrency(d.totalAssets, unit)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: METRIC_COLORS.totalLiabilities, display: 'inline-block' }} />
                          <span>总负债：</span><span style={{ fontWeight: 600 }}>{fmtCurrency(d.totalLiabilities, unit)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone" dataKey={metric} name={METRIC_LABELS[metric]}
                  stroke={METRIC_COLORS[metric]} strokeWidth={2.5} fill="url(#metricGrad)"
                  dot={{ r: 3, fill: METRIC_COLORS[metric], strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: METRIC_COLORS[metric], stroke: '#fff', strokeWidth: 2 }}
                />
                <Brush
                  dataKey="label"
                  height={28}
                  stroke={METRIC_COLORS[metric]}
                  fill="#fafafa"
                  travellerWidth={10}
                  tickFormatter={() => ''}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="该时间范围暂无数据" style={{ margin: '24px 0' }} />
        )}
      </div>

      {/* 资产时间线 */}
      <div>
        <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 10 }}>
          资产时间线
        </Text>
        <AddSnapshotCard onAdd={() => setShowEditor(true)} />
        {snapshotSummaries.map((summary) => (
          <SnapshotCard
            key={summary.weekStart}
            summary={summary}
            unit={unit}
            onClick={() => setSelectedWeek(summary.weekStart)}
            onDateChange={handleDateChange}
            onDelete={handleDeleteSnapshot}
          />
        ))}
      </div>
    </div>
  );
}
