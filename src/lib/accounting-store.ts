import { useState, useEffect, useCallback } from "react";
import { chartOfAccounts, type AccountItem } from "@/lib/demo-data";

const STORAGE_KEY = "wazeer_erp_chart_of_accounts_v1";

export function useAccountsStore() {
  const [accounts, setAccounts] = useState<AccountItem[]>(() => {
    if (typeof window === "undefined") return chartOfAccounts;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse accounts store", e);
    }
    return chartOfAccounts;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error("Failed to save accounts store", e);
    }
  }, [accounts]);

  const addAccount = useCallback((account: AccountItem) => {
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        account.parentId && a.code === account.parentId
          ? { ...a, isParent: true }
          : a,
      );
      return [...updated, account].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true }),
      );
    });
  }, []);

  const updateAccount = useCallback((code: string, updates: Partial<AccountItem>) => {
    setAccounts((prev) =>
      prev
        .map((a) => (a.code === code ? { ...a, ...updates } : a))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    );
  }, []);

  const deleteAccount = useCallback((code: string) => {
    setAccounts((prev) => {
      const codesToDelete = new Set<string>([code]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const a of prev) {
          if (a.parentId && codesToDelete.has(a.parentId) && !codesToDelete.has(a.code)) {
            codesToDelete.add(a.code);
            changed = true;
          }
        }
      }
      const remaining = prev.filter((a) => !codesToDelete.has(a.code));
      const deletedAccount = prev.find((a) => a.code === code);
      if (deletedAccount?.parentId) {
        const siblingsRemain = remaining.some((a) => a.parentId === deletedAccount.parentId);
        if (!siblingsRemain) {
          return remaining.map((a) =>
            a.code === deletedAccount.parentId ? { ...a, isParent: false } : a,
          );
        }
      }
      return remaining;
    });
  }, []);

  return {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
  };
}
