import { useState, useEffect, useCallback } from "react";
import { type AccountItem, type JournalEntry, chartOfAccounts, journal as initialJournalEntries } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";

export function useAccountsStore() {
  const [accounts, setAccounts] = useState<AccountItem[]>(chartOfAccounts);
  const [loading, setLoading] = useState(false);

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

// Helper to generate balanced live journal entries directly from Supabase tables
export async function fetchLiveOperationalJournal(): Promise<JournalEntry[]> {
  try {
    const [ordersRes, shiftsRes, movesRes, branchesRes, customLinesRes] = await Promise.all([
      supabase.from("pos_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("pos_shifts").select("*"),
      supabase.from("stock_moves").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("branches").select("*"),
      supabase.from("journal_lines").select(`
        id,
        debit,
        credit,
        line_no,
        memo,
        journal_entries ( id, entry_no, entry_date, reference, description_ar, description_en ),
        accounts ( code, name_ar, name_en )
      `),
    ]);

    const branches = branchesRes.data || [];
    const orders = ordersRes.data || [];
    const shifts = shiftsRes.data || [];
    const moves = movesRes.data || [];
    const customLines = customLinesRes.data || [];

    const resultEntries: JournalEntry[] = [];

    // 1. Real custom entries from journal_lines if any
    if (customLines && customLines.length > 0) {
      for (const line of customLines as any[]) {
        const je = line.journal_entries;
        resultEntries.push({
          id: je?.entry_no || `JV-${line.id.slice(0, 8)}`,
          date: je?.entry_date || new Date().toISOString().slice(0, 10),
          reference: je?.reference || undefined,
          memo: {
            ar: line.memo || je?.description_ar || "قيد محاسبي معتمد",
            en: line.memo || je?.description_en || "Journal Entry",
          },
          accountCode: line.accounts?.code || "1000",
          account: {
            ar: line.accounts?.name_ar || "حساب عام",
            en: line.accounts?.name_en || "General Account",
          },
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          status: "posted",
        });
      }
    }

    // Branch helper
    const getBranchInfo = (branchId?: string | null) => {
      const b = branches.find((item) => item.id === branchId || item.code === branchId);
      if (b) {
        return {
          code: b.code || "korba",
          name: { ar: b.name_ar, en: b.name_en },
        };
      }
      return {
        code: "korba",
        name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch" },
      };
    };

    // 2. Real POS Sales Orders (pos_orders)
    for (const o of orders) {
      const entryId = `JV-${o.order_number}`;
      const date = (o.created_at || new Date().toISOString()).slice(0, 10);
      const branch = getBranchInfo(o.branch_id);

      const total = Number(o.total || 0);
      const tax = Number(o.tax_amount || 0);
      const subtotal = Math.round((total - tax) * 100) / 100;

      const paymentMethod = o.payment_method || "cash";
      let debitCode = "111901";
      let debitName = {
        ar: `درج كاشير POS — ${branch.name.ar}`,
        en: `POS Cash Drawer — ${branch.name.en}`,
      };

      if (paymentMethod === "card") {
        debitCode = "1125";
        debitName = {
          ar: "وسيط شبكات وبطاقات الدفع POS Card Clearing",
          en: "POS Card Clearing",
        };
      } else if (paymentMethod === "waffarha_voucher") {
        debitCode = "1128";
        debitName = {
          ar: "وسيط قسائم ومحافظ إلكترونية (وفرها)",
          en: "Vouchers & Wallets Clearing (Waffarha)",
        };
      } else if (branch.code === "maadi") {
        debitCode = "111903";
      } else if (branch.code === "tagamoa") {
        debitCode = "111904";
      } else if (branch.code === "coast" || branch.code === "sahel") {
        debitCode = "111905";
      } else if (branch.code === "alex") {
        debitCode = "111906";
      } else if (branch.code === "kitchen") {
        debitCode = "111907";
      }

      // Debit payment line
      resultEntries.push({
        id: entryId,
        date,
        reference: o.order_number,
        memo: {
          ar: `إثبات تحصيل مبيعات فاتورة كاشير ${o.order_number} (${o.cashier_name || "كاشير"})`,
          en: `POS Sales Revenue Collection ${o.order_number}`,
        },
        branchId: branch.code,
        branchName: branch.name,
        accountCode: debitCode,
        account: debitName,
        debit: total,
        credit: 0,
        status: "posted",
      });

      // Credit revenue line
      resultEntries.push({
        id: entryId,
        date,
        reference: o.order_number,
        memo: {
          ar: `إيرادات مبيعات حلويات ومخبوزات — فاتورة ${o.order_number}`,
          en: `Confectionery Sales Revenue — ${o.order_number}`,
        },
        branchId: branch.code,
        branchName: branch.name,
        accountCode: "4110",
        account: {
          ar: "إيرادات مبيعات الحلويات والمخبوزات",
          en: "Confectionery Sales Revenue",
        },
        debit: 0,
        credit: subtotal,
        status: "posted",
      });

      // Credit tax line
      if (tax > 0) {
        resultEntries.push({
          id: entryId,
          date,
          reference: o.order_number,
          memo: {
            ar: `ضريبة القيمة المضافة 14% — فاتورة ${o.order_number}`,
            en: `VAT Output 14% — ${o.order_number}`,
          },
          branchId: branch.code,
          branchName: branch.name,
          accountCode: "2120",
          account: {
            ar: "ضريبة القيمة المضافة المستحقة (14%)",
            en: "VAT Payable (14%)",
          },
          debit: 0,
          credit: tax,
          status: "posted",
        });
      }
    }

    // 3. Real POS Shifts Opening Float (pos_shifts)
    for (const s of shifts) {
      const openAmount = Number(s.opening_cash || 0);
      if (openAmount > 0) {
        const branch = getBranchInfo(s.branch_id);
        const entryId = `JV-SHIFT-${s.shift_number || s.id.slice(0, 8)}`;
        const date = (s.opened_at || new Date().toISOString()).slice(0, 10);

        resultEntries.push({
          id: entryId,
          date,
          reference: s.shift_number || "SHIFT",
          memo: {
            ar: `إثبات عهدة نقدية لفتح وردية الكاشير (${s.cashier_name || "كاشير"}) - ${s.shift_number}`,
            en: `Opening Cash Float for Shift ${s.shift_number}`,
          },
          branchId: branch.code,
          branchName: branch.name,
          accountCode: "111901",
          account: {
            ar: `درج كاشير POS — ${branch.name.ar}`,
            en: `POS Cash Drawer — ${branch.name.en}`,
          },
          debit: openAmount,
          credit: 0,
          status: "posted",
        });

        resultEntries.push({
          id: entryId,
          date,
          reference: s.shift_number || "SHIFT",
          memo: {
            ar: `صرف عهدة نقدية من الخزينة الرئيسية لفتح وردية ${s.shift_number}`,
            en: `Cash Float Disbursed from Main Safe for ${s.shift_number}`,
          },
          branchId: branch.code,
          branchName: branch.name,
          accountCode: "1111",
          account: {
            ar: "الخزينة النقدية الرئيسية",
            en: "Main Cash Safe",
          },
          debit: 0,
          credit: openAmount,
          status: "posted",
        });
      }
    }

    // 4. Real Inventory Cost of Goods Sold from stock_moves (out moves)
    const outMoves = moves.filter((m) => m.move_type === "out" && Number(m.quantity || 0) > 0);
    for (const m of outMoves) {
      const unitCost = Number(m.unit_cost || 0);
      const qty = Number(m.quantity || 0);
      const totalCost = Math.round(qty * unitCost * 100) / 100;
      if (totalCost <= 0) continue;

      const entryId = `JV-COGS-${m.move_no || m.id.slice(0, 8)}`;
      const date = (m.moved_at || m.created_at || new Date().toISOString()).slice(0, 10);

      resultEntries.push({
        id: entryId,
        date,
        reference: m.reference || m.move_no,
        memo: {
          ar: `إثبات تكلفة البضاعة المباعة (COGS) لحركة المخزون ${m.move_no} (${m.reference || ""})`,
          en: `Cost of Goods Sold (COGS) for stock move ${m.move_no}`,
        },
        accountCode: "5100",
        account: {
          ar: "تكلفة البضاعة المباعة (COGS)",
          en: "Cost of Goods Sold (COGS)",
        },
        debit: totalCost,
        credit: 0,
        status: "posted",
      });

      resultEntries.push({
        id: entryId,
        date,
        reference: m.reference || m.move_no,
        memo: {
          ar: `صرف مخزون حلويات وبضاعة تامة لحركة ${m.move_no}`,
          en: `Inventory Reduction for ${m.move_no}`,
        },
        accountCode: "1131",
        account: {
          ar: "مخزون بضاعة بغرض البيع (بضاعة تامة)",
          en: "Finished Goods Merchandise Inventory",
        },
        debit: 0,
        credit: totalCost,
        status: "posted",
      });
    }

    return resultEntries;
  } catch (err) {
    console.error("Failed to fetch live operational journal:", err);
    return [];
  }
}

export function useJournalStore() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  const fetchJournal = useCallback(async () => {
    setLoading(true);
    try {
      const liveEntries = await fetchLiveOperationalJournal();
      if (liveEntries && liveEntries.length > 0) {
        setEntries(liveEntries);
        setIsLive(true);
      } else {
        // Fallback to initial demo data only if database is completely empty
        setEntries(initialJournalEntries);
        setIsLive(false);
      }
    } catch {
      setEntries(initialJournalEntries);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const addEntries = useCallback(async (newEntries: JournalEntry[]) => {
    setEntries((prev) => {
      const next = [...newEntries, ...prev];
      return next;
    });
  }, []);

  const resetToDefaultEntries = useCallback(() => {
    fetchJournal();
  }, [fetchJournal]);

  return {
    entries,
    loading,
    isLive,
    addEntries,
    resetToDefaultEntries,
    fetchJournal,
  };
}
