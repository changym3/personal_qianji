import { useState } from 'react';
import { InputNumber, Input, Button, Space } from 'antd';
import { DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { Item } from '../../types';

interface ItemRowProps {
  item: Item;
  onUpdate: (updates: Partial<Pick<Item, 'name' | 'amount'>>) => void;
  onRemove: () => void;
}

export default function ItemRow({ item, onUpdate, onRemove }: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editAmount, setEditAmount] = useState(item.amount);

  const handleSave = () => {
    onUpdate({ name: editName, amount: editAmount });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <Input
          size="small"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          style={{ flex: 1 }}
        />
        <InputNumber
          size="small"
          value={editAmount}
          onChange={(v) => setEditAmount(v ?? 0)}
          min={0}
          style={{ width: 120 }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
        />
        <Button size="small" type="link" icon={<CheckOutlined />} onClick={handleSave} />
        <Button size="small" type="link" icon={<CloseOutlined />} onClick={handleCancel} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
      }}
    >
      <span style={{ flex: 1 }}>{item.name}</span>
      <span style={{ width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </span>
      <Space size={0} style={{ marginLeft: 8 }}>
        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => setEditing(true)} />
        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </Space>
    </div>
  );
}
