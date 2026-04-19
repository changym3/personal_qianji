import { useState } from 'react';
import { Button, Input, Typography, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Category } from '../../types';
import { useAccountStore } from '../../store/useAccountStore';
import GroupCard from './GroupCard';

const { Title, Text } = Typography;

interface CategoryPanelProps {
  category: Category;
}

export default function CategoryPanel({ category }: CategoryPanelProps) {
  const { addGroup, removeGroup, renameGroup, addItem, removeItem, updateItem } = useAccountStore();
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const isAsset = category.type === 'asset';
  const label = isAsset ? '资产' : '负债';
  const color = isAsset ? '#52c41a' : '#ff4d4f';

  const total = category.groups.reduce(
    (sum, g) => sum + g.items.reduce((a, i) => a + i.amount, 0),
    0
  );

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    addGroup(category.type, newGroupName.trim());
    setNewGroupName('');
    setAddingGroup(false);
  };

  return (
    <div style={{ flex: 1, minWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color }}>
          {label}
        </Title>
        <Text strong style={{ fontSize: 18, color, fontVariantNumeric: 'tabular-nums' }}>
          {total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Text>
      </div>

      {category.groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          categoryType={category.type}
          onAddItem={(name, amount) => addItem(category.type, group.id, name, amount)}
          onRemoveItem={(itemId) => removeItem(category.type, group.id, itemId)}
          onUpdateItem={(itemId, updates) => updateItem(category.type, group.id, itemId, updates)}
          onRemoveGroup={() => removeGroup(category.type, group.id)}
          onRenameGroup={(name) => renameGroup(category.type, group.id, name)}
        />
      ))}

      {addingGroup ? (
        <Space style={{ marginTop: 8 }}>
          <Input
            placeholder="分组名称"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onPressEnter={handleAddGroup}
            autoFocus
          />
          <Button type="primary" onClick={handleAddGroup}>确定</Button>
          <Button onClick={() => setAddingGroup(false)}>取消</Button>
        </Space>
      ) : (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAddingGroup(true)}
          style={{ width: '100%' }}
        >
          添加{label}分组
        </Button>
      )}
    </div>
  );
}
