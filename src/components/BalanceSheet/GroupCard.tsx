import { useState } from 'react';
import { Card, Input, Button, InputNumber, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { Group } from '../../types';
import ItemRow from './ItemRow';

const { Text } = Typography;

interface GroupCardProps {
  group: Group;
  categoryType: 'asset' | 'liability';
  onAddItem: (name: string, amount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<{ name: string; amount: number }>) => void;
  onRemoveGroup: () => void;
  onRenameGroup: (name: string) => void;
}

export default function GroupCard({
  group,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onRemoveGroup,
  onRenameGroup,
}: GroupCardProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState(group.name);

  const groupTotal = group.items.reduce((sum, i) => sum + i.amount, 0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddItem(newName.trim(), newAmount);
    setNewName('');
    setNewAmount(0);
    setAdding(false);
  };

  const handleRename = () => {
    if (renameTo.trim()) {
      onRenameGroup(renameTo.trim());
    }
    setRenaming(false);
  };

  const title = renaming ? (
    <Space>
      <Input
        size="small"
        value={renameTo}
        onChange={(e) => setRenameTo(e.target.value)}
        onPressEnter={handleRename}
        autoFocus
      />
      <Button size="small" type="link" icon={<CheckOutlined />} onClick={handleRename} />
      <Button size="small" type="link" icon={<CloseOutlined />} onClick={() => setRenaming(false)} />
    </Space>
  ) : (
    <Space>
      <span>{group.name}</span>
      <Button size="small" type="link" icon={<EditOutlined />} onClick={() => { setRenameTo(group.name); setRenaming(true); }} />
    </Space>
  );

  return (
    <Card
      size="small"
      title={title}
      extra={
        <Space>
          <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
            {groupTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Text>
          <Popconfirm title="确定删除该分组？" onConfirm={onRemoveGroup} okText="删除" cancelText="取消">
            <Button size="small" type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      }
      style={{ marginBottom: 12 }}
    >
      {group.items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onUpdate={(updates) => onUpdateItem(item.id, updates)}
          onRemove={() => onRemoveItem(item.id)}
        />
      ))}

      {adding ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            size="small"
            placeholder="条目名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleAdd}
            autoFocus
          />
          <InputNumber
            size="small"
            placeholder="金额"
            value={newAmount}
            onChange={(v) => setNewAmount(v ?? 0)}
            min={0}
            style={{ width: 120 }}
          />
          <Button size="small" type="primary" onClick={handleAdd}>
            确定
          </Button>
          <Button size="small" onClick={() => setAdding(false)}>
            取消
          </Button>
        </div>
      ) : (
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
          style={{ marginTop: 8, width: '100%' }}
        >
          添加条目
        </Button>
      )}
    </Card>
  );
}
