import { useState, useEffect, useCallback } from "react";
import { type AccountItem, type JournalEntry } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";

export function useAccountsStore() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('accounts').select('*');
    if (data) {
      setAccounts(data.map(a => {
        let level = 1;
        let currentParentId = a.parent_id;
        let parentCode: string | undefined = undefined;
        
        while (currentParentId) {
          const parent = data.find(p => p.id === currentParentId);
          if (parent) {
            if (level === 1) parentCode = parent.code;
            level++;
            currentParentId = parent.parent_id;
          } else {
            break;
          }
        }

        return {
          code: a.code,
          name: { ar: a.name_ar, en: a.name_en },
          type: a.type as any,
          normalBalance: 'debit',
          balance: Number(a.opening_balance || 0),
          parentId: parentCode,
          level,
          isParent: a.is_parent || false,
          status: a.is_active ? 'active' : 'inactive',
        };
      }));
    }
    
    if (!data || data.length === 0) {
      setAccounts([]);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(async (account: AccountItem) => {
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        account.parentId && a.code === account.parentId ? { ...a, isParent: true } : a
      );
      return [...updated, account].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    });
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
  }, []);

  const updateAccount = useCallback(async (code: string, updates: Partial<AccountItem>) => {
    setAccounts((prev) =>
      prev
        .map((a) => (a.code === code ? { ...a, ...updates } : a))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    );
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
    
    if (Object.keys(dbUpdate).length > 0) {
      await supabase.from('accounts').update(dbUpdate).eq('code', code);
    }
  }, []);

  const deleteAccount = useCallback(async (code: string) => {
    setAccounts((prev) => prev.filter(a => a.code !== code));
    await supabase.from('accounts').delete().eq('code', code);
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
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJournal = useCallback(async () => {
    setLoading(true);
    // Simple fetch: we might need journal_lines joined, but for now we just load basic entries 
    // or map them to the UI shape. Since UI uses a flattened JournalEntry per line:
    const { data } = await supabase
      .from('journal_lines')
      .select(`
        id,
        debit,
        credit,
        journal_entries ( id, entry_no, date, reference ),
        accounts ( code, name_ar, name_en )
      `);
      
    if (data) {
      const mapped = data.map((line: any) => ({
        id: line.journal_entries?.entry_no || line.id,
        date: line.journal_entries?.date || new Date().toISOString(),
        account: { 
          ar: line.accounts?.name_ar || 'Unknown', 
          en: line.accounts?.name_en || 'Unknown' 
        },
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
      }));
      setEntries(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const addEntries = useCallback(async (newEntries: JournalEntry[]) => {
    setEntries((prev) => [...newEntries, ...prev]);
    // Would insert into journal_entries and journal_lines here
  }, []);

  return {
    entries,
    loading,
    addEntries,
    fetchJournal,
  };
}
