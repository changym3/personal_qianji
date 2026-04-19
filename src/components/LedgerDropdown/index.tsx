import { useState, useRef, useEffect } from 'react';
import { Button, Dropdown, Input, Popconfirm, Tooltip, message } from 'antd';
import type { InputRef } from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAccountStore } from '../../store/useAccountStore';

export default function LedgerDropdown({ onSwitch }: { onSwitch?: () => void }) {
  const { currentLedgerName, ledgerNames, switchLedger, addLedger, renameLedger, deleteLedger } =
    useAccountStore();

  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingName, setRenamingName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const newInputRef = useRef<InputRef>(null);
  const renameInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (addingNew) {
      setTimeout(() => newInputRef.current?.focus(), 80);
    }
  }, [addingNew]);

  useEffect(() => {
    if (renamingName !== null) {
      setTimeout(() => renameInputRef.current?.focus(), 80);
    }
  }, [renamingName]);


  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (ledgerNames.includes(trimmed)) {
      message.warning('账本名称已存在');
      return;
    }
    addLedger(trimmed);
    message.success(`账本「${trimmed}」已创建`);
    setNewName('');
    setAddingNew(false);
    setOpen(false);
  };

  const handleRename = (oldName: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingName(null);
      return;
    }
    if (trimmed === oldName) {
      setRenamingName(null);
      return;
    }
    if (ledgerNames.includes(trimmed)) {
      message.warning('账本名称已存在');
      return;
    }
    renameLedger(oldName, trimmed);
    message.success(`账本已更名为「${trimmed}」`);
    setRenamingName(null);
  };

  const handleDelete = (name: string) => {
    if (ledgerNames.length <= 1) {
      message.warning('至少保留一个账本');
      return;
    }
    deleteLedger(name);
    message.success(`账本「${name}」已删除`);
  };

  const dropdownContent = (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        padding: '8px 0',
        minWidth: 220,
        maxWidth: 280,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 标题 */}
      <div
        style={{
          padding: '6px 16px 10px',
          fontSize: 12,
          color: '#999',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <BookOutlined />
        账本管理
      </div>

      {/* 账本列表 */}
      {ledgerNames.map((name) => (
        <div
          key={name}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            background: name === currentLedgerName ? '#e6f4ff' : 'transparent',
            borderRadius: 6,
            margin: '2px 6px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (name !== currentLedgerName) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              name === currentLedgerName ? '#e6f4ff' : 'transparent';
          }}
          onClick={() => {
            if (renamingName === name) return;
            if (name !== currentLedgerName) onSwitch?.();
            switchLedger(name);
            setOpen(false);
            setRenamingName(null);
          }}
        >
          {renamingName === name ? (
            <div
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={renameInputRef}
                size="small"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onPressEnter={() => handleRename(name)}
                style={{ flex: 1 }}
              />
              <Button
                size="small"
                type="link"
                icon={<CheckOutlined />}
                style={{ padding: 0, height: 20 }}
                onClick={() => handleRename(name)}
              />
              <Button
                size="small"
                type="link"
                icon={<CloseOutlined />}
                style={{ padding: 0, height: 20 }}
                onClick={() => setRenamingName(null)}
              />
            </div>
          ) : (
            <>
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: name === currentLedgerName ? 600 : 400,
                  color: name === currentLedgerName ? '#1677ff' : '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="重命名">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    style={{ color: '#bbb', padding: '0 4px' }}
                    onClick={() => {
                      setRenamingName(name);
                      setRenameValue(name);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title={`确定删除账本「${name}」？`}
                  description="删除后数据不可恢复。"
                  onConfirm={() => handleDelete(name)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={ledgerNames.length <= 1}
                >
                  <Tooltip title={ledgerNames.length <= 1 ? '至少保留一个账本' : '删除'}>
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      style={{ color: '#bbb', padding: '0 4px' }}
                      disabled={ledgerNames.length <= 1}
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
            </>
          )}
        </div>
      ))}

      {/* 新增区域 */}
      <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 6, paddingTop: 6, padding: '6px 12px 4px' }}>
        {addingNew ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Input
                ref={newInputRef}
                size="small"
                placeholder="新账本名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={handleAdd}
              style={{ flex: 1 }}
            />
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleAdd}
              style={{ padding: '0 6px' }}
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => {
                setAddingNew(false);
                setNewName('');
              }}
              style={{ padding: '0 6px' }}
            />
          </div>
        ) : (
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddingNew(true)}
            style={{ width: '100%' }}
          >
            新增账本
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setAddingNew(false);
          setNewName('');
          setRenamingName(null);
        }
      }}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
    >
      <Button
        style={{ minWidth: 130, maxWidth: 180, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <BookOutlined style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
          }}
        >
          {currentLedgerName}
        </span>
        <DownOutlined style={{ fontSize: 11, flexShrink: 0, color: '#999' }} />
      </Button>
    </Dropdown>
  );
}
