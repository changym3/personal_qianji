import { useState } from 'react';
import { Typography, Empty, Button } from 'antd';
import { UpOutlined, DownOutlined, LeftOutlined, FileTextOutlined } from '@ant-design/icons';
import type { Category, Group } from '../../types';

const { Text } = Typography;

const fmtCurrency = (v: number) =>
  '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

function ReadonlyGroup({ group, categoryType }: { group: Group; categoryType: 'asset' | 'liability' }) {
  const [expanded, setExpanded] = useState(true);
  const total = group.items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #f5f5f5' : 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>{group.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {fmtCurrency(total)}
          </span>
          {expanded
            ? <UpOutlined style={{ fontSize: 11, color: '#999' }} />
            : <DownOutlined style={{ fontSize: 11, color: '#999' }} />
          }
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 20px 12px' }}>
          {group.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: idx < group.items.length - 1 ? '1px solid #f9f9f9' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: categoryType === 'asset' ? '#fff7e6' : '#fff1f0',
                  fontSize: 14,
                }}>
                  {categoryType === 'asset' ? '📊' : '📋'}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtCurrency(item.amount)}
              </span>
            </div>
          ))}
          {group.items.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, padding: '8px 0', display: 'block' }}>（无条目）</Text>
          )}
        </div>
      )}
    </div>
  );
}

interface SnapshotDetailProps {
  categories?: Category[];
  weekStart: string;
  totalAssets: number;
  totalLiabilities: number;
  remark?: string;
  onBack: () => void;
}

export default function SnapshotDetail({ categories, weekStart, totalAssets, totalLiabilities, remark, onBack }: SnapshotDetailProps) {
  const hasCategories = !!categories && categories.length > 0;
  const assetCat = hasCategories ? categories.find((c) => c.type === 'asset') : undefined;
  const liabilityCat = hasCategories ? categories.find((c) => c.type === 'liability') : undefined;
  const netWorth = totalAssets - totalLiabilities;
  const [assetExpanded, setAssetExpanded] = useState(true);
  const [liabilityExpanded, setLiabilityExpanded] = useState(true);

  return (
    <div>
      <Button
        type="text"
        icon={<LeftOutlined />}
        onClick={onBack}
        style={{ marginBottom: 12, padding: '4px 8px', color: '#1677ff' }}
      >
        返回趋势
      </Button>

      {/* Summary */}
      <div style={{
        background: '#fafafa',
        borderRadius: 12,
        padding: '24px 24px 20px',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{weekStart} 快照</Text>
        <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>净资产</div>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 16px',
        }}>
          {fmtCurrency(netWorth)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 80 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>总资产</Text>
            <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {fmtCurrency(totalAssets)}
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>总负债</Text>
            <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2, color: '#ff7a45' }}>
              -{fmtCurrency(totalLiabilities)}
            </div>
          </div>
        </div>
      </div>

      {!hasCategories ? (
        <Empty description="该快照仅有汇总数据，无分组明细" style={{ margin: '24px 0' }} />
      ) : (
        <>
          {/* Asset section */}
          {assetCat && (
            <>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 4px', marginBottom: assetExpanded ? 10 : 16,
                  cursor: 'pointer', userSelect: 'none',
                }}
                onClick={() => setAssetExpanded((v) => !v)}
              >
                <Text strong style={{ fontSize: 17 }}>总资产</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCurrency(totalAssets)}
                  </span>
                  {assetExpanded
                    ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
                    : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
                  }
                </div>
              </div>
              {assetExpanded && assetCat.groups.map((group) => (
                <ReadonlyGroup key={group.id} group={group} categoryType="asset" />
              ))}
            </>
          )}

          {/* Liability section */}
          {liabilityCat && (
            <>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 4px', marginBottom: liabilityExpanded ? 10 : 16,
                  cursor: 'pointer', userSelect: 'none',
                }}
                onClick={() => setLiabilityExpanded((v) => !v)}
              >
                <Text strong style={{ fontSize: 17 }}>总负债</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#ff7a45', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCurrency(totalLiabilities)}
                  </span>
                  {liabilityExpanded
                    ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
                    : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
                  }
                </div>
              </div>
              {liabilityExpanded && liabilityCat.groups.map((group) => (
                <ReadonlyGroup key={group.id} group={group} categoryType="liability" />
              ))}
            </>
          )}
        </>
      )}

      {/* Remark section */}
      <div style={{ padding: '12px 4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileTextOutlined style={{ fontSize: 15, color: '#999' }} />
        <Text strong style={{ fontSize: 17 }}>备注</Text>
      </div>
      {remark ? (
        <div style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 14,
          color: '#333',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {remark}
        </div>
      ) : (
        <div style={{
          background: '#fafafa',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 14,
          color: '#bbb',
        }}>
          无备注
        </div>
      )}
    </div>
  );
}
