export interface Item {
  id: string;
  name: string;
  amount: number;
  excludeFromTotal?: boolean;
  isFamilyAsset?: boolean;
}

export interface Group {
  id: string;
  name: string;
  items: Item[];
}

export interface Category {
  id: string;
  type: 'asset' | 'liability';
  groups: Group[];
}

export interface WeeklySnapshot {
  weekStart: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  categories?: Category[];
  remark?: string;
}

export interface Account {
  id: string;
  name: string;
  categories: Category[];
  snapshots: WeeklySnapshot[];
}
