import { useState } from 'react';
import { Typography, Divider, Button, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAccountStore } from '../../store/useAccountStore';
import { calculateTotals } from '../../utils/snapshot';
import GroupSection from './GroupSection';

const { Text } = Typography;

const fmtCurrency = (v: number) =>
  '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

export default function BalanceSheet() {
  const { account, addGroup } = useAccountStore();
  const [addingAssetGroup, setAddingAssetGroup] = useState(false);
  const [addingLiabilityGroup, setAddingLiabilityGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const assetCat = account.categories.find((c) => c.type === 'asset')!;
  const liabilityCat = account.categories.find((c) => c.type === 'liability')!;
  const { totalAssets, totalLiabilities, netWorth } = calculateTotals(account);

  const assetItemCount = assetCat.groups.reduce((s, g) => s + g.items.length, 0);
  const liabilityItemCount = liabilityCat.groups.reduce((s, g) => s + g.items.length, 0);
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const total = totalAssets + totalLiabilities;
  const assetRatio = total > 0 ? (totalAssets / total) * 100 : 50;

  const handleAddGroup = (type: 'asset' | 'liability') => {
    if (!newGroupName.trim()) return;
    addGroup(type, newGroupName.trim());
    setNewGroupName('');
    setAddingAssetGroup(false);
    setAddingLiabilityGroup(false);
  };

  return (
    <div>
      {/* Summary card */}
      <div style={{
        background: '#fafafa',
        borderRadius: 12,
        padding: '28px 24px 24px',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <Text type="secondary" style={{ fontSize: 13 }}>净资产</Text>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 20px',
        }}>
          {fmtCurrency(netWorth)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 80 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>总资产</Text>
            <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {fmtCurrency(totalAssets)}
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>总负债</Text>
            <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2, color: '#ff7a45' }}>
              -{fmtCurrency(totalLiabilities)}
            </div>
          </div>
        </div>
      </div>

      {/* Asset analysis bar */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>资产分析</div>
        <div style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          background: '#f0f0f0',
          marginBottom: 10,
        }}>
          <div style={{
            width: `${assetRatio}%`,
            background: 'linear-gradient(90deg, #ff7a45, #ffa940)',
            transition: 'width 0.3s',
          }} />
          <div style={{
            width: `${100 - assetRatio}%`,
            background: '#e8e8e8',
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
          <span>{assetItemCount} 项资产 | {liabilityItemCount} 项负债</span>
          <span>负债率 <strong style={{ color: '#333' }}>{debtRatio.toFixed(2)}%</strong></span>
        </div>

        <Divider style={{ margin: '14px 0' }} />

        <div style={{ display: 'flex', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, background: '#f0f5ff', fontSize: 14,
              }}>⬆</span>
              <Text type="secondary" style={{ fontSize: 13 }}>总借入</Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', paddingLeft: 36 }}>
              {totalLiabilities.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, background: '#f0f5ff', fontSize: 14,
              }}>⬇</span>
              <Text type="secondary" style={{ fontSize: 13 }}>总借出</Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', paddingLeft: 36 }}>
              0.00
            </div>
          </div>
        </div>
      </div>

      {/* Asset groups */}
      <div style={{ marginBottom: 10 }}>
        <Text strong style={{ fontSize: 17, paddingLeft: 4 }}>总资产</Text>
      </div>
      {assetCat.groups.map((group) => (
        <GroupSection key={group.id} group={group} categoryType="asset" />
      ))}
      {addingAssetGroup ? (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', padding: '0 20px' }}>
          <Input
            placeholder="资产分组名称"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onPressEnter={() => handleAddGroup('asset')}
            autoFocus
          />
          <Button type="primary" onClick={() => handleAddGroup('asset')}>确定</Button>
          <Button onClick={() => { setAddingAssetGroup(false); setNewGroupName(''); }}>取消</Button>
        </div>
      ) : (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => { setNewGroupName('未分组'); setAddingAssetGroup(true); }}
          style={{ width: '100%', marginBottom: 16 }}
        >
          添加资产分组
        </Button>
      )}

      {/* Liability groups */}
      <div style={{ marginTop: 8, marginBottom: 10 }}>
        <Text strong style={{ fontSize: 17, paddingLeft: 4 }}>总负债</Text>
      </div>
      {liabilityCat.groups.map((group) => (
        <GroupSection key={group.id} group={group} categoryType="liability" />
      ))}
      {addingLiabilityGroup ? (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', padding: '0 20px' }}>
          <Input
            placeholder="负债分组名称"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onPressEnter={() => handleAddGroup('liability')}
            autoFocus
          />
          <Button type="primary" onClick={() => handleAddGroup('liability')}>确定</Button>
          <Button onClick={() => { setAddingLiabilityGroup(false); setNewGroupName(''); }}>取消</Button>
        </div>
      ) : (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => { setNewGroupName('未分组'); setAddingLiabilityGroup(true); }}
          style={{ width: '100%' }}
        >
          添加负债分组
        </Button>
      )}
    </div>
  );
}
