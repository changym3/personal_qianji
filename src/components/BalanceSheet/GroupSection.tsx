import { useState } from 'react';
import { Input, InputNumber, Button, Space, Popconfirm } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { Group } from '../../types';
import { useAccountStore } from '../../store/useAccountStore';

const fmtCurrency = (v: number) =>
  '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

interface GroupSectionProps {
  group: Group;
  categoryType: 'asset' | 'liability';
}

export default function GroupSection({ group, categoryType }: GroupSectionProps) {
  const { addItem, removeItem, updateItem, removeGroup, renameGroup } = useAccountStore();

  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState(group.name);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState(0);

  const groupTotal = group.items.reduce((sum, i) => sum + i.amount, 0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addItem(categoryType, group.id, newName.trim(), newAmount);
    setNewName('');
    setNewAmount(0);
    setAdding(false);
  };

  const handleRename = () => {
    if (renameTo.trim()) renameGroup(categoryType, group.id, renameTo.trim());
    setRenaming(false);
  };

  const startEditItem = (id: string, name: string, amount: number) => {
    setEditingItemId(id);
    setEditName(name);
    setEditAmount(amount);
  };

  const saveEditItem = () => {
    if (editingItemId) {
      updateItem(categoryType, group.id, editingItemId, { name: editName, amount: editAmount });
      setEditingItemId(null);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Group header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {renaming ? (
            <Space onClick={(e) => e.stopPropagation()}>
              <Input
                size="small"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                onPressEnter={handleRename}
                autoFocus
                style={{ width: 140 }}
              />
              <Button size="small" type="link" icon={<CheckOutlined />} onClick={handleRename} />
              <Button size="small" type="link" icon={<CloseOutlined />} onClick={() => setRenaming(false)} />
            </Space>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 15 }}>{group.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {fmtCurrency(groupTotal)}
          </span>
          {expanded ? <UpOutlined style={{ fontSize: 11, color: '#999' }} /> : <DownOutlined style={{ fontSize: 11, color: '#999' }} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 20px 12px' }}>
          {/* Items */}
          {group.items.map((item) => (
            <div key={item.id}>
              {editingItemId === item.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
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
                    style={{ width: 130 }}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
                  />
                  <Button size="small" type="link" icon={<CheckOutlined />} onClick={saveEditItem} />
                  <Button size="small" type="link" icon={<CloseOutlined />} onClick={() => setEditingItemId(null)} />
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #f9f9f9',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCurrency(item.amount)}
                    </span>
                    <Button
                      size="small"
                      type="link"
                      icon={<EditOutlined />}
                      style={{ color: '#bbb' }}
                      onClick={() => startEditItem(item.id, item.name, item.amount)}
                    />
                    <Popconfirm
                      title="确定删除？"
                      onConfirm={() => removeItem(categoryType, group.id, item.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ color: '#bbb' }} />
                    </Popconfirm>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add item form */}
          {adding ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
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
                style={{ width: 130 }}
              />
              <Button size="small" type="primary" onClick={handleAdd}>确定</Button>
              <Button size="small" onClick={() => setAdding(false)}>取消</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setAdding(true)}
                style={{ flex: 1 }}
              >
                添加条目
              </Button>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => { setRenameTo(group.name); setRenaming(true); }}
              />
              <Popconfirm
                title="确定删除该分组？"
                onConfirm={() => removeGroup(categoryType, group.id)}
                okText="删除"
                cancelText="取消"
              >
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
