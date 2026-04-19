import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, Input, InputNumber, DatePicker, Typography, message, Popconfirm, Segmented, Switch, Tooltip } from 'antd';
import {
  LeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  FileAddOutlined,
  CopyOutlined,
  FileTextOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Category } from '../../types';
import { useAccountStore } from '../../store/useAccountStore';
import { useChartSettingsStore } from '../../store/useChartSettingsStore';
import type { Unit } from '../../store/useChartSettingsStore';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const { Text } = Typography;

const fmtCurrency = (v: number, unit: Unit = 'yuan') => {
  const val = unit === 'wan' ? v / 10000 : v;
  const suffix = unit === 'wan' ? '万' : '';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
};

interface EditorItem {
  id: string;
  name: string;
  amount: number;
  excludeFromTotal?: boolean;
  isFamilyAsset?: boolean;
}

interface EditorGroup {
  id: string;
  name: string;
  items: EditorItem[];
}

const ICON_COLORS = ['#ff7a45', '#ffa940', '#36cfc9', '#597ef7', '#9254de', '#f759ab', '#73d13d'];

function getIconColor(index: number) {
  return ICON_COLORS[index % ICON_COLORS.length];
}

// ---- 可拖拽条目行 ----
function DraggableItemRow({
  item,
  idx,
  categoryType,
  isDragging,
  onEdit,
  onRemove,
}: {
  item: EditorItem;
  idx: number;
  categoryType: 'asset' | 'liability' | 'family';
  isDragging: boolean;
  onEdit: (item: EditorItem) => void;
  onRemove: (id: string) => void;
}) {
  const { unit } = useChartSettingsStore();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `item:${item.id}` });

  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: '1px solid #f9f9f9',
    opacity: isDragging ? 0.3 : (item.excludeFromTotal ? 0.55 : 1),
    transform: CSS.Translate.toString(transform),
  };

  const iconChar = categoryType === 'asset' ? '📊' : categoryType === 'family' ? '🏠' : '📋';

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          {...listeners}
          {...attributes}
          style={{ cursor: 'grab', color: '#ccc', fontSize: 16, display: 'flex', alignItems: 'center', touchAction: 'none' }}
        >
          <HolderOutlined />
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          background: getIconColor(idx),
          fontSize: 16, color: '#fff',
          flexShrink: 0,
        }}>
          {iconChar}
        </span>
        <div>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</span>
          {item.excludeFromTotal && (
            <Tooltip title="该条目不计入总资产统计">
              <span style={{
                marginLeft: 6, fontSize: 11, color: '#faad14',
                background: '#fffbe6', border: '1px solid #ffe58f',
                borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle',
              }}>
                不计入
              </span>
            </Tooltip>
          )}
          {item.isFamilyAsset && (
            <Tooltip title="该条目为家庭资产">
              <span style={{
                marginLeft: 6, fontSize: 11, color: '#1677ff',
                background: '#e6f4ff', border: '1px solid #91caff',
                borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle',
              }}>
                家庭资产
              </span>
            </Tooltip>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {fmtCurrency(item.amount, unit)}
        </span>
        <Button size="small" type="link" icon={<EditOutlined />} style={{ color: '#bbb' }}
          onClick={() => onEdit(item)} />
        <Popconfirm title="确定删除？" onConfirm={() => onRemove(item.id)} okText="删除" cancelText="取消">
          <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ color: '#bbb' }}
            onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      </div>
    </div>
  );
}

// ---- 条目拖拽 Overlay ----
function DragOverlayItem({ item, categoryType }: { item: EditorItem; categoryType: 'asset' | 'liability' | 'family' }) {
  const { unit } = useChartSettingsStore();
  const iconChar = categoryType === 'asset' ? '📊' : categoryType === 'family' ? '🏠' : '📋';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', borderRadius: 8, padding: '10px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      opacity: 0.95,
    }}>
      <HolderOutlined style={{ color: '#ccc', fontSize: 16 }} />
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: '50%',
        background: '#597ef7', fontSize: 14, color: '#fff',
      }}>
        {iconChar}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
      <span style={{ fontSize: 14, color: '#888', marginLeft: 8 }}>{fmtCurrency(item.amount, unit)}</span>
    </div>
  );
}

// ---- 分组拖拽 Overlay ----
function DragOverlayGroup({ group }: { group: EditorGroup }) {
  const { unit } = useChartSettingsStore();
  const total = group.items.reduce((s, i) => s + (i.excludeFromTotal ? 0 : i.amount), 0);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      opacity: 0.95,
    }}>
      <HolderOutlined style={{ color: '#ccc', fontSize: 16 }} />
      <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{group.name}</span>
      <span style={{ fontSize: 13, color: '#888' }}>{group.items.length} 个条目</span>
      <span style={{ fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>
        {fmtCurrency(total, unit)}
      </span>
    </div>
  );
}

// ---- 可放置的分组内容区（条目拖入分组） ----
function DroppableGroupZone({
  groupId,
  isOver,
  children,
}: {
  groupId: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `group:${groupId}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 8,
        transition: 'background 0.15s',
        background: isOver ? '#f0f7ff' : 'transparent',
        outline: isOver ? '2px dashed #91caff' : '2px dashed transparent',
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
}

// ---- EditableGroup（含分组自身可拖拽 + 内容可放置） ----
function EditableGroup({
  group,
  onUpdate,
  onRemove,
  categoryType,
  draggingItemId,
  draggingGroupId,
  overDropId,
}: {
  group: EditorGroup;
  onUpdate: (g: EditorGroup) => void;
  onRemove: () => void;
  categoryType: 'asset' | 'liability' | 'family';
  draggingItemId: string | null;
  draggingGroupId: string | null;
  overDropId: string | null;
}) {
  const { unit } = useChartSettingsStore();
  // 家庭资产分组中的条目天然就是家庭资产，不需要「计入家庭资产」开关
  const isFamilySection = categoryType === 'family';
  const [expanded, setExpanded] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number>(0);
  const [newItemExclude, setNewItemExclude] = useState(false);
  const [newItemFamilyAsset, setNewItemFamilyAsset] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editExclude, setEditExclude] = useState(false);
  const [editFamilyAsset, setEditFamilyAsset] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState(group.name);
  const editRowRef = useRef<HTMLDivElement>(null);

  const total = group.items.reduce((s, i) => s + (i.excludeFromTotal ? 0 : i.amount), 0);

  // 分组自身拖拽
  const groupDragId = `groupcard:${categoryType}:${group.id}`;
  const {
    attributes: groupDragAttributes,
    listeners: groupDragListeners,
    setNodeRef: setGroupDragRef,
    transform: groupDragTransform,
  } = useDraggable({ id: groupDragId });

  // 分组作为放置目标（分组排序）
  const { setNodeRef: setGroupDropRef } = useDroppable({ id: `groupdrop:${categoryType}:${group.id}` });

  const handleRename = () => {
    if (renameTo.trim()) {
      onUpdate({ ...group, name: renameTo.trim() });
    }
    setRenaming(false);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    onUpdate({
      ...group,
      items: [...group.items, {
        id: uuidv4(),
        name: newItemName.trim(),
        amount: newItemAmount,
        excludeFromTotal: newItemExclude,
        isFamilyAsset: newItemFamilyAsset,
      }],
    });
    setNewItemName('');
    setNewItemAmount(0);
    setNewItemExclude(false);
    setNewItemFamilyAsset(false);
    setAddingItem(false);
  };

  const removeItem = (itemId: string) => {
    onUpdate({ ...group, items: group.items.filter((i) => i.id !== itemId) });
  };

  const startEdit = (item: EditorItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditExclude(item.excludeFromTotal ?? false);
    setEditFamilyAsset(item.isFamilyAsset ?? false);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdate({
      ...group,
      items: group.items.map((i) =>
        i.id === editingId ? {
          ...i,
          name: editName,
          amount: editAmount,
          excludeFromTotal: editExclude,
          isFamilyAsset: editFamilyAsset,
        } : i
      ),
    });
    setEditingId(null);
  };

  const handleEditRowBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editRowRef.current?.contains(e.relatedTarget as Node)) return;
    saveEdit();
  };

  const isGroupDragging = draggingGroupId === group.id;
  const isItemOver = overDropId === `group:${group.id}`;
  // 分组排序高亮：拖拽其他分组悬浮在本分组上
  const isGroupOver = !isGroupDragging && overDropId === `groupdrop:${categoryType}:${group.id}`;

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    opacity: isGroupDragging ? 0.3 : 1,
    transform: CSS.Translate.toString(groupDragTransform),
    outline: isGroupOver ? '2px dashed #91caff' : '2px dashed transparent',
    transition: 'outline 0.15s, opacity 0.15s',
  };

  return (
    // 外层：分组拖放目标（用于分组排序碰撞检测）+ 分组拖拽源
    <div ref={(node) => { setGroupDragRef(node); setGroupDropRef(node); }} style={cardStyle}>
      {/* 分组标题 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #f5f5f5' : 'none',
        }}
        onClick={() => !renaming && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 分组拖拽手柄 */}
          <span
            {...groupDragListeners}
            {...groupDragAttributes}
            style={{ cursor: 'grab', color: '#ccc', fontSize: 15, display: 'flex', alignItems: 'center', touchAction: 'none', marginRight: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <HolderOutlined />
          </span>
          {renaming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <Input
                size="small" value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                onPressEnter={handleRename}
                autoFocus style={{ width: 140 }}
              />
              <Button size="small" type="link" icon={<CheckOutlined />} onClick={handleRename} />
              <Button size="small" type="link" icon={<CloseOutlined />} onClick={() => setRenaming(false)} />
            </div>
          ) : (
            <>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{group.name}</span>
              <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#bbb', padding: 0 }}
                onClick={(e) => { e.stopPropagation(); setRenameTo(group.name); setRenaming(true); }} />
              <Popconfirm title="确定删除该分组？" onConfirm={onRemove} okText="删除" cancelText="取消">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ color: '#bbb', padding: 0 }}
                  onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {fmtCurrency(total, unit)}
          </span>
          {expanded ? <UpOutlined style={{ fontSize: 11, color: '#999' }} /> : <DownOutlined style={{ fontSize: 11, color: '#999' }} />}
        </div>
      </div>

      {expanded && (
        <DroppableGroupZone groupId={group.id} isOver={isItemOver}>
          <div style={{ padding: '0 20px 12px' }}>
            {group.items.map((item, idx) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div
                    ref={editRowRef}
                    onBlur={handleEditRowBlur}
                    style={{ borderBottom: '1px solid #f9f9f9', padding: '10px 0' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Input
                        size="small" value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onPressEnter={saveEdit}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <InputNumber
                        size="small" value={editAmount}
                        onChange={(v) => setEditAmount(v ?? 0)}
                        onPressEnter={saveEdit}
                        min={0} style={{ width: 130 }}
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
                      />
                      <Button size="small" type="link" icon={<CheckOutlined />} onMouseDown={(e) => { e.preventDefault(); saveEdit(); }} />
                      <Button size="small" type="link" icon={<CloseOutlined />} onMouseDown={(e) => { e.preventDefault(); setEditingId(null); }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#888' }}>不计入总资产</span>
                        <Switch
                          size="small"
                          checked={editExclude}
                          onChange={(checked) => setEditExclude(checked)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#888' }}>计入家庭资产</span>
                        <Switch
                          size="small"
                          checked={editFamilyAsset}
                          onChange={(checked) => setEditFamilyAsset(checked)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <DraggableItemRow
                    item={item}
                    idx={idx}
                    categoryType={categoryType}
                    isDragging={draggingItemId === item.id}
                    onEdit={startEdit}
                    onRemove={removeItem}
                  />
                )}
              </div>
            ))}

            {addingItem ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    size="small" placeholder="条目名称" value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onPressEnter={handleAddItem}
                    autoFocus
                  />
                  <InputNumber
                    size="small" placeholder="金额" value={newItemAmount}
                    onChange={(v) => setNewItemAmount(v ?? 0)}
                    onPressEnter={handleAddItem}
                    min={0} style={{ width: 140 }}
                  />
                  <Button size="small" type="primary" onClick={handleAddItem}>确定</Button>
                  <Button size="small" onClick={() => { setAddingItem(false); setNewItemExclude(false); }}>取消</Button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>不计入总资产</span>
                    <Switch size="small" checked={newItemExclude} onChange={setNewItemExclude} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>计入家庭资产</span>
                    <Switch size="small" checked={newItemFamilyAsset} onChange={setNewItemFamilyAsset} />
                  </div>
                </div>
              </div>
            ) : (
              <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => { setAddingItem(true); setNewItemFamilyAsset(isFamilySection); }}
                style={{ width: '100%', marginTop: 8 }}>
                添加条目
              </Button>
            )}
          </div>
        </DroppableGroupZone>
      )}
    </div>
  );
}

// ---- 可放置的大类标题区域 ----
function DroppableCategoryHeader({
  categoryType,
  isOver,
  children,
}: {
  categoryType: 'asset' | 'liability' | 'family';
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `category:${categoryType}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 8,
        transition: 'background 0.15s',
        background: isOver ? '#f0f7ff' : 'transparent',
        outline: isOver ? '2px dashed #91caff' : '2px dashed transparent',
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
}

function categoriesToGroups(categories: Category[], type: 'asset' | 'liability' | 'family'): EditorGroup[] {
  if (type === 'family') {
    // 从 asset category 中提取所有带 isFamilyAsset=true 的条目，按原分组聚合
    const cat = categories.find((c) => c.type === 'asset');
    if (!cat) return [];
    const groups: EditorGroup[] = [];
    for (const g of cat.groups) {
      const familyItems = g.items.filter((i) => i.isFamilyAsset);
      if (familyItems.length > 0) {
        groups.push({
          id: uuidv4(),
          name: g.name,
          items: familyItems.map((i) => ({ id: uuidv4(), name: i.name, amount: i.amount, excludeFromTotal: i.excludeFromTotal, isFamilyAsset: true })),
        });
      }
    }
    return groups;
  }
  const cat = categories.find((c) => c.type === type);
  if (!cat) return [];
  return cat.groups.map((g) => ({
    id: uuidv4(),
    name: g.name,
    // 普通资产分组只保留非家庭资产条目
    items: g.items
      .filter((i) => type !== 'asset' || !i.isFamilyAsset)
      .map((i) => ({ id: uuidv4(), name: i.name, amount: i.amount, excludeFromTotal: i.excludeFromTotal, isFamilyAsset: i.isFamilyAsset })),
  })).filter((g) => g.items.length > 0);
}

function createBlankGroups(): EditorGroup[] {
  return [{ id: uuidv4(), name: '未分组', items: [{ id: uuidv4(), name: '未命名', amount: 0 }] }];
}

type SnapshotTemplate = 'blank' | 'latest';

interface SnapshotEditorProps {
  onBack: () => void;
  onSaved: () => void;
  snapshot?: { categories?: Category[]; weekStart: string; remark?: string };
  pageTitle?: string;
}

export default function SnapshotEditor({ onBack, onSaved, snapshot, pageTitle }: SnapshotEditorProps) {
  const { account, saveFullSnapshot, removeSnapshot } = useAccountStore();
  const { unit, familyAssetMode } = useChartSettingsStore();

  const isEditMode = !!snapshot;

  const latestSnapshot = account.snapshots.length > 0
    ? [...account.snapshots].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
    : null;

  const getSourceCategories = (template: SnapshotTemplate): Category[] => {
    if (isEditMode) return snapshot!.categories ?? [];
    if (template === 'latest' && latestSnapshot?.categories) return latestSnapshot.categories;
    return [];
  };

  const [template, setTemplate] = useState<SnapshotTemplate>('latest');
  const [date, setDate] = useState<dayjs.Dayjs>(() => {
    if (isEditMode) return dayjs(snapshot!.weekStart);
    // 新建模式：从今天往前找第一个不与已有快照冲突的日期
    const existingDates = new Set(account.snapshots.map((s) => s.weekStart));
    let candidate = dayjs();
    while (existingDates.has(candidate.format('YYYY-MM-DD'))) {
      candidate = candidate.subtract(1, 'day');
    }
    return candidate;
  });
  const [assetGroups, setAssetGroups] = useState<EditorGroup[]>(() => {
    if (isEditMode) return categoriesToGroups(snapshot!.categories ?? [], 'asset');
    if (latestSnapshot?.categories) return categoriesToGroups(latestSnapshot.categories, 'asset');
    return createBlankGroups();
  });
  const [liabilityGroups, setLiabilityGroups] = useState<EditorGroup[]>(() => {
    if (isEditMode) return categoriesToGroups(snapshot!.categories ?? [], 'liability');
    if (latestSnapshot?.categories) return categoriesToGroups(latestSnapshot.categories, 'liability');
    return createBlankGroups();
  });
  const [familyGroups, setFamilyGroups] = useState<EditorGroup[]>(() => {
    if (isEditMode) return categoriesToGroups(snapshot!.categories ?? [], 'family');
    if (latestSnapshot?.categories) return categoriesToGroups(latestSnapshot.categories, 'family');
    return createBlankGroups();
  });

  const handleTemplateChange = (value: SnapshotTemplate) => {
    setTemplate(value);
    const cats = getSourceCategories(value);
    if (value === 'blank') {
      setAssetGroups(createBlankGroups());
      setLiabilityGroups(createBlankGroups());
      setFamilyGroups(createBlankGroups());
    } else {
      const assetResult = categoriesToGroups(cats, 'asset');
      const liabilityResult = categoriesToGroups(cats, 'liability');
      const familyResult = categoriesToGroups(cats, 'family');
      setAssetGroups(assetResult.length > 0 ? assetResult : createBlankGroups());
      setLiabilityGroups(liabilityResult.length > 0 ? liabilityResult : createBlankGroups());
      setFamilyGroups(familyResult);
    }
  };

  const [addingAssetGroup, setAddingAssetGroup] = useState(false);
  const [addingLiabilityGroup, setAddingLiabilityGroup] = useState(false);
  const [addingFamilyGroup, setAddingFamilyGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [assetSectionExpanded, setAssetSectionExpanded] = useState(true);
  const [liabilitySectionExpanded, setLiabilitySectionExpanded] = useState(true);
  const [familySectionExpanded, setFamilySectionExpanded] = useState(true);
  const [remark, setRemark] = useState(snapshot?.remark ?? '');
  const [remarkEditing, setRemarkEditing] = useState(false);

  // 拖拽状态：区分条目拖拽与分组拖拽
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  type SectionType = 'asset' | 'liability' | 'family';

  // 找到某个条目所在的分组和大类
  const findItemLocation = (itemId: string): { categoryType: SectionType; groupId: string; item: EditorItem } | null => {
    for (const g of assetGroups) {
      const item = g.items.find((i) => i.id === itemId);
      if (item) return { categoryType: 'asset', groupId: g.id, item };
    }
    for (const g of liabilityGroups) {
      const item = g.items.find((i) => i.id === itemId);
      if (item) return { categoryType: 'liability', groupId: g.id, item };
    }
    for (const g of familyGroups) {
      const item = g.items.find((i) => i.id === itemId);
      if (item) return { categoryType: 'family', groupId: g.id, item };
    }
    return null;
  };

  // 找到某个分组信息
  const findGroupInfo = (groupId: string): { categoryType: SectionType; group: EditorGroup } | null => {
    const ag = assetGroups.find((g) => g.id === groupId);
    if (ag) return { categoryType: 'asset', group: ag };
    const lg = liabilityGroups.find((g) => g.id === groupId);
    if (lg) return { categoryType: 'liability', group: lg };
    const fg = familyGroups.find((g) => g.id === groupId);
    if (fg) return { categoryType: 'family', group: fg };
    return null;
  };

  const getGroupsByCategoryType = (ct: SectionType) => {
    if (ct === 'asset') return assetGroups;
    if (ct === 'liability') return liabilityGroups;
    return familyGroups;
  };

  const setGroupsByCategoryType = (ct: SectionType, updater: (gs: EditorGroup[]) => EditorGroup[]) => {
    if (ct === 'asset') setAssetGroups(updater);
    else if (ct === 'liability') setLiabilityGroups(updater);
    else setFamilyGroups(updater);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverDropId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const prevDraggingId = draggingId;
    setDraggingId(null);
    setOverDropId(null);

    const { active, over } = event;
    if (!over || !prevDraggingId) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const SECTION_LABELS: Record<SectionType, string> = { asset: '资产', liability: '负债', family: '家庭资产' };

    // ---- 条目拖拽 ----
    if (activeId.startsWith('item:')) {
      const realItemId = activeId.slice('item:'.length);
      const loc = findItemLocation(realItemId);
      if (!loc) return;

      let targetCategoryType: SectionType;
      let targetGroupId: string | null = null;

      if (overId.startsWith('group:')) {
        targetGroupId = overId.slice('group:'.length);
        const found = findGroupInfo(targetGroupId.split(':')[0]);
        if (!found) {
          // fallback: search all sections
          if (assetGroups.some((g) => g.id === targetGroupId)) targetCategoryType = 'asset';
          else if (liabilityGroups.some((g) => g.id === targetGroupId)) targetCategoryType = 'liability';
          else if (familyGroups.some((g) => g.id === targetGroupId)) targetCategoryType = 'family';
          else return;
        } else {
          targetCategoryType = found.categoryType;
        }
      } else if (overId.startsWith('category:')) {
        targetCategoryType = overId.slice('category:'.length) as SectionType;
        const groups = getGroupsByCategoryType(targetCategoryType);
        if (groups.length === 0) return;
        targetGroupId = groups[0].id;
      } else if (overId.startsWith('groupdrop:')) {
        const parts = overId.split(':');
        targetCategoryType = parts[1] as SectionType;
        targetGroupId = parts[2];
      } else {
        return;
      }

      if (loc.groupId === targetGroupId) return;

      // 条目移入家庭资产区时自动打上 isFamilyAsset，移出时清除
      const movedItem: EditorItem = {
        ...loc.item,
        isFamilyAsset: targetCategoryType === 'family' ? true : (targetCategoryType === 'asset' ? false : loc.item.isFamilyAsset),
      };

      const removeFrom = (gs: EditorGroup[]) =>
        gs.map((g) => g.id === loc.groupId ? { ...g, items: g.items.filter((i) => i.id !== movedItem.id) } : g);
      const addTo = (gs: EditorGroup[]) =>
        gs.map((g) => g.id === targetGroupId ? { ...g, items: [...g.items, movedItem] } : g);

      if (loc.categoryType === targetCategoryType) {
        setGroupsByCategoryType(targetCategoryType, (gs) => addTo(removeFrom(gs)));
      } else {
        setGroupsByCategoryType(loc.categoryType, removeFrom);
        setGroupsByCategoryType(targetCategoryType, addTo);
      }
      message.success(`已移动到「${SECTION_LABELS[targetCategoryType]}」`);
      return;
    }

    // ---- 分组拖拽（仅支持同大类内排序） ----
    if (activeId.startsWith('groupcard:')) {
      const parts = activeId.split(':');
      const srcCategory = parts[1] as SectionType;
      const srcGroupId = parts[2];

      if (!overId.startsWith('groupdrop:')) return;
      const overParts = overId.split(':');
      const dstCategory = overParts[1] as SectionType;
      const dstGroupId = overParts[2];

      if (srcCategory !== dstCategory || srcGroupId === dstGroupId) return;

      const reorder = (gs: EditorGroup[]) => {
        const srcIdx = gs.findIndex((g) => g.id === srcGroupId);
        const dstIdx = gs.findIndex((g) => g.id === dstGroupId);
        if (srcIdx === -1 || dstIdx === -1) return gs;
        const next = [...gs];
        const [moved] = next.splice(srcIdx, 1);
        next.splice(dstIdx, 0, moved);
        return next;
      };

      setGroupsByCategoryType(srcCategory, reorder);
    }
  };

  // 家庭资产：独立的 familyGroups
  const familyAssetTotal = familyGroups.reduce(
    (s, g) => s + g.items.reduce((a, i) => a + (!i.excludeFromTotal ? i.amount : 0), 0),
    0
  );
  // 普通资产（assetGroups 中全部，不含家庭资产条目）
  const baseAssets = assetGroups.reduce(
    (s, g) => s + g.items.reduce((a, i) => a + (!i.excludeFromTotal ? i.amount : 0), 0),
    0
  );
  // 负债
  const baseLiabilities = liabilityGroups.reduce(
    (s, g) => s + g.items.reduce((a, i) => a + (!i.excludeFromTotal ? i.amount : 0), 0),
    0
  );

  const { totalAssets, totalLiabilities, netWorth } = (() => {
    if (familyAssetMode === 'exclude') {
      return { totalAssets: baseAssets, totalLiabilities: baseLiabilities, netWorth: baseAssets - baseLiabilities };
    }
    if (familyAssetMode === 'as-liability') {
      return {
        totalAssets: baseAssets,
        totalLiabilities: baseLiabilities + familyAssetTotal,
        netWorth: baseAssets - baseLiabilities - familyAssetTotal,
      };
    }
    // deduct-asset
    return {
      totalAssets: baseAssets - familyAssetTotal,
      totalLiabilities: baseLiabilities,
      netWorth: baseAssets - familyAssetTotal - baseLiabilities,
    };
  })();

  const handleAddGroup = (type: 'asset' | 'liability' | 'family') => {
    if (!newGroupName.trim()) return;
    const newGroup: EditorGroup = { id: uuidv4(), name: newGroupName.trim(), items: [] };
    if (type === 'asset') setAssetGroups((gs) => [...gs, newGroup]);
    else if (type === 'liability') setLiabilityGroups((gs) => [...gs, newGroup]);
    else setFamilyGroups((gs) => [...gs, newGroup]);
    setNewGroupName('');
    setAddingAssetGroup(false);
    setAddingLiabilityGroup(false);
    setAddingFamilyGroup(false);
  };

  const updateAssetGroup = (idx: number, g: EditorGroup) => {
    setAssetGroups((gs) => gs.map((og, i) => (i === idx ? g : og)));
  };

  const updateLiabilityGroup = (idx: number, g: EditorGroup) => {
    setLiabilityGroups((gs) => gs.map((og, i) => (i === idx ? g : og)));
  };

  const updateFamilyGroup = (idx: number, g: EditorGroup) => {
    setFamilyGroups((gs) => gs.map((og, i) => (i === idx ? g : og)));
  };

  // Overlay 信息
  const draggingItemId = draggingId?.startsWith('item:') ? draggingId.slice('item:'.length) : null;
  const draggingGroupCardId = draggingId?.startsWith('groupcard:') ? draggingId.split(':')[2] : null;
  const draggingItemInfo = draggingItemId ? findItemLocation(draggingItemId) : null;
  const draggingGroupInfo = draggingGroupCardId ? findGroupInfo(draggingGroupCardId) : null;
  // family section 的 overDropId 判断
  const isFamilyOver = overDropId === 'category:family';

  const handleSave = () => {
    const snapshotDate = date.format('YYYY-MM-DD');

    // 新建模式下，若日期已存在快照则提示用户，避免静默覆盖
    if (!isEditMode && account.snapshots.some((s) => s.weekStart === snapshotDate)) {
      message.warning(`${snapshotDate} 已存在快照，请修改日期后再保存`);
      return;
    }

    // 将 familyGroups 合并回 asset category（同名分组合并，否则追加）
    const mergedAssetGroups = [...assetGroups.map((g) => ({
      id: g.id,
      name: g.name,
      items: g.items.map((i) => ({ id: i.id, name: i.name, amount: i.amount, excludeFromTotal: i.excludeFromTotal, isFamilyAsset: false as boolean | undefined })),
    }))];
    for (const fg of familyGroups) {
      const existing = mergedAssetGroups.find((g) => g.name === fg.name);
      const familyItems = fg.items.map((i) => ({ id: i.id, name: i.name, amount: i.amount, excludeFromTotal: i.excludeFromTotal, isFamilyAsset: true as boolean | undefined }));
      if (existing) {
        existing.items = [...existing.items, ...familyItems];
      } else {
        mergedAssetGroups.push({ id: fg.id, name: fg.name, items: familyItems });
      }
    }

    const categories: Category[] = [
      {
        id: uuidv4(),
        type: 'asset',
        groups: mergedAssetGroups,
      },
      {
        id: uuidv4(),
        type: 'liability',
        groups: liabilityGroups.map((g) => ({
          id: g.id,
          name: g.name,
          items: g.items.map((i) => ({ id: i.id, name: i.name, amount: i.amount, excludeFromTotal: i.excludeFromTotal, isFamilyAsset: i.isFamilyAsset })),
        })),
      },
    ];
    if (isEditMode && snapshot.weekStart !== snapshotDate) {
      removeSnapshot(snapshot.weekStart);
    }
    saveFullSnapshot(snapshotDate, categories, remark.trim() || undefined);
    message.success(`快照已保存（${snapshotDate}）`);
    onSaved();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div>
        {pageTitle && (
          <Text strong style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>
            {pageTitle}
          </Text>
        )}
        <Button
          type="text" icon={<LeftOutlined />} onClick={onBack}
          style={{ marginBottom: 12, padding: '4px 8px', color: '#1677ff' }}
        >
          返回趋势
        </Button>

        {/* Date picker + summary */}
        <div style={{
          background: '#fafafa', borderRadius: 12,
          padding: '24px 24px 20px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, flexShrink: 0 }}>快照日期</Text>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d)}
              allowClear={false}
              style={{ flex: 1 }}
            />
          </div>
          {!isEditMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, flexShrink: 0 }}>初始数据</Text>
              <Segmented
                size="small"
                value={template}
                onChange={(v) => handleTemplateChange(v as SnapshotTemplate)}
                options={[
                  { label: <span><CopyOutlined style={{ marginRight: 4 }} />最新快照</span>, value: 'latest', disabled: !latestSnapshot?.categories },
                  { label: <span><FileAddOutlined style={{ marginRight: 4 }} />空白快照</span>, value: 'blank' },
                ]}
                style={{ flex: 1 }}
              />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>净资产</Text>
            <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '4px 0 12px' }}>
              {fmtCurrency(netWorth, unit)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 80 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>总资产</Text>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                  {fmtCurrency(totalAssets, unit)}
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>总负债</Text>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2, color: '#ff7a45' }}>
                  -{fmtCurrency(totalLiabilities, unit)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset section */}
        <DroppableCategoryHeader
          categoryType="asset"
          isOver={overDropId === 'category:asset'}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 4px', marginBottom: assetSectionExpanded ? 10 : 16,
              cursor: 'pointer', userSelect: 'none',
            }}
            onClick={() => setAssetSectionExpanded((v) => !v)}
          >
            <Text strong style={{ fontSize: 17 }}>总资产</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}>
                {fmtCurrency(totalAssets, unit)}
              </span>
              {assetSectionExpanded
                ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
                : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              }
            </div>
          </div>
        </DroppableCategoryHeader>

        {assetSectionExpanded && (
          <>
            {assetGroups.map((g, idx) => (
              <EditableGroup
                key={g.id}
                group={g}
                categoryType="asset"
                draggingItemId={draggingItemId}
                draggingGroupId={draggingGroupCardId}
                overDropId={overDropId}
                onUpdate={(updated) => updateAssetGroup(idx, updated)}
                onRemove={() => setAssetGroups((gs) => gs.filter((_, i) => i !== idx))}
              />
            ))}
            {addingAssetGroup ? (
              <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
                <Input placeholder="资产分组名称" value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onPressEnter={() => handleAddGroup('asset')} autoFocus />
                <Button type="primary" onClick={() => handleAddGroup('asset')}>确定</Button>
                <Button onClick={() => { setAddingAssetGroup(false); setNewGroupName(''); }}>取消</Button>
              </div>
            ) : (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setNewGroupName('未分组'); setAddingAssetGroup(true); }}
                style={{ width: '100%', marginBottom: 16 }}>
                添加资产分组
              </Button>
            )}
          </>
        )}

        {/* Liability section */}
        <DroppableCategoryHeader
          categoryType="liability"
          isOver={overDropId === 'category:liability'}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 4px', marginBottom: liabilitySectionExpanded ? 10 : 16,
              cursor: 'pointer', userSelect: 'none',
            }}
            onClick={() => setLiabilitySectionExpanded((v) => !v)}
          >
            <Text strong style={{ fontSize: 17 }}>总负债</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#ff7a45', fontVariantNumeric: 'tabular-nums' }}>
                {fmtCurrency(totalLiabilities, unit)}
              </span>
              {liabilitySectionExpanded
                ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
                : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              }
            </div>
          </div>
        </DroppableCategoryHeader>

        {liabilitySectionExpanded && (
          <>
            {liabilityGroups.map((g, idx) => (
              <EditableGroup
                key={g.id}
                group={g}
                categoryType="liability"
                draggingItemId={draggingItemId}
                draggingGroupId={draggingGroupCardId}
                overDropId={overDropId}
                onUpdate={(updated) => updateLiabilityGroup(idx, updated)}
                onRemove={() => setLiabilityGroups((gs) => gs.filter((_, i) => i !== idx))}
              />
            ))}
            {addingLiabilityGroup ? (
              <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
                <Input placeholder="负债分组名称" value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onPressEnter={() => handleAddGroup('liability')} autoFocus />
                <Button type="primary" onClick={() => handleAddGroup('liability')}>确定</Button>
                <Button onClick={() => { setAddingLiabilityGroup(false); setNewGroupName(''); }}>取消</Button>
              </div>
            ) : (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setNewGroupName('未分组'); setAddingLiabilityGroup(true); }}
                style={{ width: '100%', marginBottom: 24 }}>
                添加负债分组
              </Button>
            )}
          </>
        )}

        {/* Family Asset section */}
        <DroppableCategoryHeader
          categoryType="family"
          isOver={isFamilyOver}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 4px', marginBottom: familySectionExpanded ? 10 : 16,
              cursor: 'pointer', userSelect: 'none',
            }}
            onClick={() => setFamilySectionExpanded((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 17 }}>家庭资产</Text>
              {familyAssetMode !== 'exclude' && (
                <span style={{
                  fontSize: 11, color: '#faad14',
                  background: '#fffbe6', border: '1px solid #ffe58f',
                  borderRadius: 4, padding: '1px 6px',
                }}>
                  {familyAssetMode === 'as-liability' ? '计入负债' : '从资产扣除'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                {fmtCurrency(familyAssetTotal, unit)}
              </span>
              {familySectionExpanded
                ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
                : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              }
            </div>
          </div>
        </DroppableCategoryHeader>

        {familySectionExpanded && (
          <>
            {familyGroups.map((g, idx) => (
              <EditableGroup
                key={g.id}
                group={g}
                categoryType="family"
                draggingItemId={draggingItemId}
                draggingGroupId={draggingGroupCardId}
                overDropId={overDropId}
                onUpdate={(updated) => updateFamilyGroup(idx, updated)}
                onRemove={() => setFamilyGroups((gs) => gs.filter((_, i) => i !== idx))}
              />
            ))}
            {addingFamilyGroup ? (
              <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
                <Input placeholder="家庭资产分组名称" value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onPressEnter={() => handleAddGroup('family')} autoFocus />
                <Button type="primary" onClick={() => handleAddGroup('family')}>确定</Button>
                <Button onClick={() => { setAddingFamilyGroup(false); setNewGroupName(''); }}>取消</Button>
              </div>
            ) : (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setNewGroupName('未分组'); setAddingFamilyGroup(true); }}
                style={{ width: '100%', marginBottom: 24 }}>
                添加家庭资产分组
              </Button>
            )}
          </>
        )}

        {/* Remark section */}
        <div style={{ padding: '12px 4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ fontSize: 15, color: '#999' }} />
          <Text strong style={{ fontSize: 17 }}>备注</Text>
        </div>
        {remarkEditing ? (
          <Input.TextArea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="添加备注（选填）"
            autoSize={{ minRows: 3, maxRows: 8 }}
            autoFocus
            onBlur={() => setRemarkEditing(false)}
            style={{ borderRadius: 10, fontSize: 14, marginBottom: 24, background: '#fff' }}
          />
        ) : (
          <div
            onClick={() => setRemarkEditing(true)}
            style={{
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 24,
              fontSize: 14,
              lineHeight: 1.7,
              minHeight: 72,
              cursor: 'text',
              background: '#fff',
              color: remark ? '#333' : '#bbb',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {remark || '添加备注（选填）'}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button size="large" block onClick={onBack}
            style={{ borderRadius: 8, height: 48, fontSize: 16 }}>
            返回
          </Button>
          <Button type="primary" size="large" block onClick={handleSave}
            style={{ borderRadius: 8, height: 48, fontSize: 16 }}>
            保存快照
          </Button>
        </div>
      </div>

      {/* 拖拽浮层预览 */}
      <DragOverlay dropAnimation={null}>
        {draggingItemInfo ? (
          <DragOverlayItem
            item={draggingItemInfo.item}
            categoryType={draggingItemInfo.categoryType}
          />
        ) : draggingGroupInfo ? (
          <DragOverlayGroup group={draggingGroupInfo.group} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
