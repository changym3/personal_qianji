import { useMemo } from 'react';
import { Empty } from 'antd';
import { useAccountStore } from '../../store/useAccountStore';
import SnapshotEditor from '../Chart/SnapshotEditor';

interface CurrentAssetProps {
  onBackToTrend: () => void;
}

export default function CurrentAsset({ onBackToTrend }: CurrentAssetProps) {
  const { account } = useAccountStore();

  const latestSnapshot = useMemo(() => {
    if (account.snapshots.length === 0) return null;
    return [...account.snapshots].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  }, [account.snapshots]);

  if (!latestSnapshot) {
    return <Empty description="暂无资产快照，请先在资产时间线新增快照" style={{ marginTop: 48 }} />;
  }

  return (
    <SnapshotEditor
      pageTitle="资产卡片详情页"
      snapshot={{ categories: latestSnapshot.categories, weekStart: latestSnapshot.weekStart }}
      onBack={onBackToTrend}
      onSaved={onBackToTrend}
    />
  );
}
