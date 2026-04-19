import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { Account, Category, Group, Item, WeeklySnapshot } from '../types';
import { takeSnapshot, upsertSnapshot, createManualSnapshot } from '../utils/snapshot';

interface AccountState {
  account: Account;
  currentLedgerName: string;
  ledgerNames: string[];
  accountsByLedger: Record<string, Account>;
  switchLedger: (name: string) => void;
  addLedger: (name: string) => void;
  renameLedger: (oldName: string, newName: string) => void;
  deleteLedger: (name: string) => void;

  // Group actions
  addGroup: (categoryType: 'asset' | 'liability', name: string) => void;
  removeGroup: (categoryType: 'asset' | 'liability', groupId: string) => void;
  renameGroup: (categoryType: 'asset' | 'liability', groupId: string, name: string) => void;

  // Item actions
  addItem: (categoryType: 'asset' | 'liability', groupId: string, name: string, amount: number) => void;
  removeItem: (categoryType: 'asset' | 'liability', groupId: string, itemId: string) => void;
  updateItem: (categoryType: 'asset' | 'liability', groupId: string, itemId: string, updates: Partial<Pick<Item, 'name' | 'amount'>>) => void;

  // Snapshot
  saveSnapshot: (date?: dayjs.Dayjs) => void;
  saveManualSnapshot: (weekStart: string, totalAssets: number, totalLiabilities: number) => void;
  saveFullSnapshot: (weekStart: string, categories: Category[], remark?: string) => void;
  removeSnapshot: (weekStart: string) => void;
  updateSnapshotDate: (oldWeekStart: string, newWeekStart: string) => void;

  // Import / Export
  importAccount: (account: Account) => void;
  resetAccount: () => void;
}

const DEFAULT_LEDGER_NAME = '测试账本';

function createDefaultAccount(): Account {
  return {
    id: uuidv4(),
    name: '我的账户',
    categories: [
      { id: uuidv4(), type: 'asset', groups: [] },
      { id: uuidv4(), type: 'liability', groups: [] },
    ],
    snapshots: [],
  };
}

function mapCategory(
  account: Account,
  type: 'asset' | 'liability',
  updater: (cat: Category) => Category
): Account {
  return {
    ...account,
    categories: account.categories.map((c) => (c.type === type ? updater(c) : c)),
  };
}

function mapGroup(cat: Category, groupId: string, updater: (g: Group) => Group): Category {
  return { ...cat, groups: cat.groups.map((g) => (g.id === groupId ? updater(g) : g)) };
}

function cloneAccount(account: Account): Account {
  return JSON.parse(JSON.stringify(account));
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => {
      const initialAccount = createDefaultAccount();

      const updateCurrentAccount = (updater: (account: Account) => Account) =>
        set((state) => {
          const nextAccount = updater(state.account);
          return {
            account: nextAccount,
            accountsByLedger: {
              ...state.accountsByLedger,
              [state.currentLedgerName]: nextAccount,
            },
          };
        });

      return {
        account: initialAccount,
        currentLedgerName: DEFAULT_LEDGER_NAME,
        ledgerNames: [DEFAULT_LEDGER_NAME],
        accountsByLedger: {
          [DEFAULT_LEDGER_NAME]: initialAccount,
        },

        switchLedger: (name) =>
          set((state) => {
            if (!name || state.currentLedgerName === name) {
              return state;
            }

            const existing = state.accountsByLedger[name];
            if (existing) {
              return {
                currentLedgerName: name,
                account: existing,
              };
            }

            const nextAccount: Account = {
              ...createDefaultAccount(),
              name,
            };

            return {
              currentLedgerName: name,
              account: nextAccount,
              ledgerNames: [...state.ledgerNames, name],
              accountsByLedger: {
                ...state.accountsByLedger,
                [name]: nextAccount,
              },
            };
          }),

        addLedger: (name) =>
          set((state) => {
            if (!name.trim() || state.ledgerNames.includes(name.trim())) return state;
            const trimmed = name.trim();
            const nextAccount: Account = { ...createDefaultAccount(), name: trimmed };
            return {
              currentLedgerName: trimmed,
              account: nextAccount,
              ledgerNames: [...state.ledgerNames, trimmed],
              accountsByLedger: {
                ...state.accountsByLedger,
                [trimmed]: nextAccount,
              },
            };
          }),

        renameLedger: (oldName, newName) =>
          set((state) => {
            const trimmed = newName.trim();
            if (!trimmed || oldName === trimmed || state.ledgerNames.includes(trimmed)) return state;

            const ledgerNames = state.ledgerNames.map((n) => (n === oldName ? trimmed : n));
            const accountsByLedger: Record<string, Account> = {};
            for (const [k, v] of Object.entries(state.accountsByLedger)) {
              accountsByLedger[k === oldName ? trimmed : k] = k === oldName ? { ...v, name: trimmed } : v;
            }

            const isCurrent = state.currentLedgerName === oldName;
            const nextAccount = isCurrent ? accountsByLedger[trimmed] : state.account;

            return {
              ledgerNames,
              accountsByLedger,
              currentLedgerName: isCurrent ? trimmed : state.currentLedgerName,
              account: nextAccount,
            };
          }),

        deleteLedger: (name) =>
          set((state) => {
            if (state.ledgerNames.length <= 1) return state;

            const ledgerNames = state.ledgerNames.filter((n) => n !== name);
            const accountsByLedger = { ...state.accountsByLedger };
            delete accountsByLedger[name];

            const isCurrentDeleted = state.currentLedgerName === name;
            const nextLedgerName = isCurrentDeleted ? ledgerNames[0] : state.currentLedgerName;
            const nextAccount = accountsByLedger[nextLedgerName];

            return {
              ledgerNames,
              accountsByLedger,
              currentLedgerName: nextLedgerName,
              account: nextAccount,
            };
          }),

        addGroup: (categoryType, name) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) => ({
              ...cat,
              groups: [...cat.groups, { id: uuidv4(), name, items: [] }],
            }))
          ),

        removeGroup: (categoryType, groupId) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) => ({
              ...cat,
              groups: cat.groups.filter((g) => g.id !== groupId),
            }))
          ),

        renameGroup: (categoryType, groupId, name) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) =>
              mapGroup(cat, groupId, (g) => ({ ...g, name }))
            )
          ),

        addItem: (categoryType, groupId, name, amount) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) =>
              mapGroup(cat, groupId, (g) => ({
                ...g,
                items: [...g.items, { id: uuidv4(), name, amount }],
              }))
            )
          ),

        removeItem: (categoryType, groupId, itemId) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) =>
              mapGroup(cat, groupId, (g) => ({
                ...g,
                items: g.items.filter((i) => i.id !== itemId),
              }))
            )
          ),

        updateItem: (categoryType, groupId, itemId, updates) =>
          updateCurrentAccount((account) =>
            mapCategory(account, categoryType, (cat) =>
              mapGroup(cat, groupId, (g) => ({
                ...g,
                items: g.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
              }))
            )
          ),

        saveSnapshot: (date?) =>
          updateCurrentAccount((account) => {
            const snap = takeSnapshot(account, date);
            return {
              ...account,
              snapshots: upsertSnapshot(account.snapshots, snap),
            };
          }),

        saveManualSnapshot: (weekStart, totalAssets, totalLiabilities) =>
          updateCurrentAccount((account) => {
            const snap = createManualSnapshot(weekStart, totalAssets, totalLiabilities);
            return {
              ...account,
              snapshots: upsertSnapshot(account.snapshots, snap),
            };
          }),

        saveFullSnapshot: (weekStart, categories, remark) =>
          updateCurrentAccount((account) => {
            let totalAssets = 0;
            let totalLiabilities = 0;
            for (const cat of categories) {
              const sum = cat.groups.reduce(
                (acc, g) => acc + g.items.reduce((a, i) => a + (i.excludeFromTotal ? 0 : i.amount), 0),
                0
              );
              if (cat.type === 'asset') totalAssets += sum;
              else totalLiabilities += sum;
            }
            const snap: WeeklySnapshot = {
              weekStart,
              totalAssets,
              totalLiabilities,
              netWorth: totalAssets - totalLiabilities,
              categories: JSON.parse(JSON.stringify(categories)),
              remark,
            };
            return {
              ...account,
              snapshots: upsertSnapshot(account.snapshots, snap),
            };
          }),

        removeSnapshot: (weekStart) =>
          updateCurrentAccount((account) => ({
            ...account,
            snapshots: account.snapshots.filter((s) => s.weekStart !== weekStart),
          })),

        updateSnapshotDate: (oldWeekStart, newWeekStart) =>
          set((state) => {
            const snapshots = state.account.snapshots;
            if (snapshots.some((s) => s.weekStart === newWeekStart)) return state;

            const nextAccount = {
              ...state.account,
              snapshots: snapshots
                .map((s) => (s.weekStart === oldWeekStart ? { ...s, weekStart: newWeekStart } : s))
                .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
            };

            return {
              account: nextAccount,
              accountsByLedger: {
                ...state.accountsByLedger,
                [state.currentLedgerName]: nextAccount,
              },
            };
          }),

        importAccount: (account) =>
          set((state) => ({
            account,
            accountsByLedger: {
              ...state.accountsByLedger,
              [state.currentLedgerName]: account,
            },
          })),

        resetAccount: () =>
          set((state) => {
            const nextAccount = createDefaultAccount();
            return {
              account: nextAccount,
              accountsByLedger: {
                ...state.accountsByLedger,
                [state.currentLedgerName]: nextAccount,
              },
            };
          }),
      };
    },
    {
      name: 'qianji-account-storage',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AccountState> | undefined;
        if (!persisted) {
          return currentState;
        }

        const persistedLedgers = persisted.accountsByLedger;
        if (persistedLedgers && typeof persistedLedgers === 'object') {
          const ledgerNames =
            Array.isArray(persisted.ledgerNames) && persisted.ledgerNames.length > 0
              ? persisted.ledgerNames
              : Object.keys(persistedLedgers);

          const fallbackLedgerName = ledgerNames[0] ?? DEFAULT_LEDGER_NAME;
          const currentLedgerName =
            persisted.currentLedgerName && persistedLedgers[persisted.currentLedgerName]
              ? persisted.currentLedgerName
              : fallbackLedgerName;

          const account = persistedLedgers[currentLedgerName] ?? currentState.account;

          return {
            ...currentState,
            ...persisted,
            ledgerNames,
            currentLedgerName,
            account,
            accountsByLedger: persistedLedgers,
          };
        }

        if (persisted.account) {
          const migratedAccount = cloneAccount(persisted.account);
          return {
            ...currentState,
            account: migratedAccount,
            currentLedgerName: DEFAULT_LEDGER_NAME,
            ledgerNames: [DEFAULT_LEDGER_NAME],
            accountsByLedger: {
              [DEFAULT_LEDGER_NAME]: migratedAccount,
            },
          };
        }

        return currentState;
      },
    }
  )
);
