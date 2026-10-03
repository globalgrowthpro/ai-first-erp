import { useState, useEffect, useCallback } from "react";
import { type AccountItem, type JournalEntry, chartOfAccounts, journal as initialJournalEntries } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";

const ACCOUNTS_STORAGE_KEY = "erp_chart_of_accounts_v4";
const JOURNAL_STORAGE_KEY = "erp_journal_entries_v3";

export function useAccountsStore() {
  const [accounts, setAccounts] = useState<AccountItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return chartOfAccounts;
  });

  const [loading, setLoading] = useState(false);

  const persistAccounts = (next: AccountItem[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');
      if (!error && data && data.length > 0) {
        const mapped: AccountItem[] = data.map((a) => {
          const defaultAcc = chartOfAccounts.find((c) => c.code === a.code);
          const rawOpening = Number(a.opening_balance ?? a.current_balance ?? 0);
          const fallbackBalance = defaultAcc ? defaultAcc.balance : 0;
          const finalBalance = rawOpening !== 0 ? rawOpening : fallbackBalance;
          const normalBal: "debit" | "credit" =
            defaultAcc?.normalBalance ||
            (["asset", "expense"].includes(a.type) ? "debit" : "credit");

          let level = defaultAcc?.level || 1;
          let parentCode: string | undefined = defaultAcc?.parentId;

          if (!parentCode && a.parent_id) {
            const parent = data.find((p) => p.id === a.parent_id);
            if (parent) {
              parentCode = parent.code;
            }
          }

          return {
            code: a.code,
            name: { ar: a.name_ar, en: a.name_en },
            type: (a.type as any) || defaultAcc?.type || "asset",
            normalBalance: normalBal,
            balance: finalBalance,
            parentId: parentCode,
            level: defaultAcc?.level ?? level,
            isParent: a.is_parent ?? defaultAcc?.isParent ?? false,
            status: a.is_active ? "active" : "inactive",
          };
        });

        // Merge mapped database accounts with branch & POS numbers if missing
        const existingCodes = new Set(mapped.map((m) => m.code));
        const missingDefaults = chartOfAccounts.filter((c) => !existingCodes.has(c.code));
        const combined = [...mapped, ...missingDefaults].sort((a, b) =>
          a.code.localeCompare(b.code, undefined, { numeric: true })
        );

        setAccounts(combined);
        persistAccounts(combined);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(async (account: AccountItem) => {
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        account.parentId && a.code === account.parentId ? { ...a, isParent: true } : a
      );
      const next = [...updated, account].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      persistAccounts(next);
      return next;
    });

    try {
      let parentUuid = null;
      if (account.parentId) {
        const { data: parentData } = await supabase.from('accounts').select('id').eq('code', account.parentId).single();
        if (parentData) parentUuid = parentData.id;
      }

      await supabase.from('accounts').insert({
        code: account.code,
        name_ar: account.name.ar,
        name_en: account.name.en,
        type: account.type as any,
        parent_id: parentUuid,
        is_parent: account.isParent || false,
        is_active: account.status === 'active',
        opening_balance: account.balance
      });
    } catch {}
  }, []);

  const updateAccount = useCallback(async (code: string, updates: Partial<AccountItem>) => {
    setAccounts((prev) => {
      const next = prev
        .map((a) => (a.code === code ? { ...a, ...updates } : a))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      persistAccounts(next);
      return next;
    });

    try {
      const dbUpdate: any = {};
      if (updates.name) { dbUpdate.name_ar = updates.name.ar; dbUpdate.name_en = updates.name.en; }
      if (updates.type) dbUpdate.type = updates.type as any;
      if (updates.parentId !== undefined) {
        if (updates.parentId === null || updates.parentId === '') {
          dbUpdate.parent_id = null;
        } else {
          const { data: parentData } = await supabase.from('accounts').select('id').eq('code', updates.parentId).single();
          if (parentData) dbUpdate.parent_id = parentData.id;
        }
      }
      if (updates.status !== undefined) dbUpdate.is_active = updates.status === 'active';
      if (updates.balance !== undefined) dbUpdate.opening_balance = updates.balance;
      
      if (Object.keys(dbUpdate).length > 0) {
        await supabase.from('accounts').update(dbUpdate).eq('code', code);
      }
    } catch {}
  }, []);

  const deleteAccount = useCallback(async (code: string) => {
    setAccounts((prev) => {
      const next = prev.filter(a => a.code !== code);
      persistAccounts(next);
      return next;
    });
    try {
      await supabase.from('accounts').delete().eq('code', code);
    } catch {}
  }, []);

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    fetchAccounts,
  };
}

export function useJournalStore() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialJournalEntries;
  });

  const [loading, setLoading] = useState(false);

  const persistEntries = (next: JournalEntry[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  const fetchJournal = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('journal_lines')
        .select(`
          id,
          debit,
          credit,
          journal_entries ( id, entry_no, date, reference ),
          accounts ( code, name_ar, name_en )
        `);
        
      if (!error && data && data.length > 0) {
        const mapped: JournalEntry[] = data.map((line: any) => ({
          id: line.journal_entries?.entry_no || line.id,
          date: line.journal_entries?.date || new Date().toISOString().slice(0, 10),
          accountCode: line.accounts?.code,
          account: { 
            ar: line.accounts?.name_ar || 'Unknown', 
            en: line.accounts?.name_en || 'Unknown' 
          },
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          reference: line.journal_entries?.reference || undefined,
          status: "posted" as const,
        }));

        setEntries(mapped);
        persistEntries(mapped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const addEntries = useCallback(async (newEntries: JournalEntry[]) => {
    setEntries((prev) => {
      const next = [...newEntries, ...prev];
      persistEntries(next);
      return next;
    });
  }, []);

  const resetToDefaultEntries = useCallback(() => {
    setEntries(initialJournalEntries);
    persistEntries(initialJournalEntries);
  }, []);

  return {
    entries,
    loading,
    addEntries,
    resetToDefaultEntries,
    fetchJournal,
  };
}
