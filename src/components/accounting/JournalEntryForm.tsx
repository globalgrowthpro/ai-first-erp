import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useJournalStore, useAccountsStore } from "@/lib/accounting-store";
import { Plus, Trash2, Building2, FileText, CheckCircle2 } from "lucide-react";

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BRANCH_OPTIONS = [
  { id: "hq", name: { ar: "الإدارة العامة — الخزينة المركزية", en: "Executive HQ Safe" } },
  { id: "korba", name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" } },
  { id: "maadi", name: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." } },
  { id: "tagamoa", name: { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St." } },
  { id: "sahel", name: { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub" } },
  { id: "alex", name: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" } },
  { id: "kitchen", name: { ar: "المطبخ المركزي — تشغيل وتوصيل", en: "Central Kitchen Hub" } },
];

export function JournalEntryForm({ open, onOpenChange }: JournalEntryFormProps) {
  const { t, pick, money } = useI18n();
  const { addEntries } = useJournalStore();
  const { accounts } = useAccountsStore();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedBranchId, setSelectedBranchId] = useState("korba");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<{ accountCode: string; debit: number; credit: number; desc?: string }[]>([
    { accountCode: "", debit: 0, credit: 0, desc: "" },
    { accountCode: "", debit: 0, credit: 0, desc: "" },
  ]);

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountCode: "", debit: 0, credit: 0, desc: "" }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "accountCode" | "debit" | "credit" | "desc",
    value: string | number
  ) => {
    setLines(prev => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      const target = { ...copy[index] };
      if (field === "accountCode") target.accountCode = String(value);
      if (field === "desc") target.desc = String(value);
      if (field === "debit") {
        target.debit = Number(value);
        if (target.debit > 0) target.credit = 0;
      }
      if (field === "credit") {
        target.credit = Number(value);
        if (target.credit > 0) target.debit = 0;
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    const id = `JV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const branchObj = BRANCH_OPTIONS.find(b => b.id === selectedBranchId) || BRANCH_OPTIONS[0];

    const newEntries = lines
      .filter(l => l.accountCode && (l.debit > 0 || l.credit > 0))
      .map(line => {
        const account = accounts.find(a => a.code === line.accountCode);
        return {
          id,
          date,
          reference: reference || `REF-${Math.floor(100 + Math.random() * 900)}`,
          memo: memo ? { ar: memo, en: memo } : { ar: "قيد تسوية يدوي", en: "Manual Adjustment Entry" },
          branchId: branchObj.id,
          branchName: branchObj.name,
          accountCode: line.accountCode,
          account: account ? account.name : { ar: line.accountCode, en: line.accountCode },
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          status: "posted" as const,
        };
      });

    if (newEntries.length > 0) {
      addEntries(newEntries);
      onOpenChange(false);
      setReference("");
      setMemo("");
      setLines([
        { accountCode: "", debit: 0, credit: 0, desc: "" },
        { accountCode: "", debit: 0, credit: 0, desc: "" },
      ]);
    }
  };

  // Only allow posting to leaf / child accounts
  const selectableAccounts = accounts.filter(a => !a.isParent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir={pick("rtl", "ltr")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="size-5 text-primary" />
            <span>{pick("إضافة قيد يومية محاسبي معتمد", "Create Official Journal Entry")}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Header Metadata: Date, Branch, Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/40 border border-border/70">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {pick("تاريخ القيد:", "Entry Date:")}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-primary shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {pick("الفرع / المركز:", "Branch / Center:")}
              </label>
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary appearance-none shadow-xs"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {pick(b.name.ar, b.name.en)}
                    </option>
                  ))}
                </select>
                <Building2 className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {pick("المرجع / المستند:", "Document Reference:")}
              </label>
              <input
                type="text"
                placeholder={pick("مثال: POS-1049 أو BANK-DEP-30", "e.g. POS-1049, CIB-DEP-01")}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-primary shadow-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {pick("البيان والشرح التفصيلي للقيد:", "Entry Memo / Description:")}
              </label>
              <input
                type="text"
                required
                placeholder={pick("شرح طبيعة القيد (مثال: إقفال مبيعات وردية، توريد نقدية بالبنك...)", "Detailed description of the transaction")}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary shadow-xs"
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-border/70 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs">
              <thead className="bg-secondary/70 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-2.5 text-start font-bold">{pick("الحساب المحاسبي", "Account")}</th>
                  <th className="p-2.5 text-start font-bold w-36">{pick("مدين (ج.م)", "Debit")}</th>
                  <th className="p-2.5 text-start font-bold w-36">{pick("دائن (ج.م)", "Credit")}</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20">
                    <td className="p-2">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleChange(idx, "accountCode", e.target.value)}
                        required
                        className="w-full rounded-xl border border-border/70 bg-background p-2 text-xs font-bold outline-none focus:border-primary"
                      >
                        <option value="">{pick("-- اختر الحساب من الدليل --", "-- Select Account --")}</option>
                        {selectableAccounts.map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {pick(a.name.ar, a.name.en)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ""}
                        onChange={(e) => handleChange(idx, "debit", Number(e.target.value))}
                        className="w-full rounded-xl border border-border/70 bg-background p-2 text-xs font-mono font-bold outline-none focus:border-primary text-emerald-600 dark:text-emerald-400"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ""}
                        onChange={(e) => handleChange(idx, "credit", Number(e.target.value))}
                        className="w-full rounded-xl border border-border/70 bg-background p-2 text-xs font-mono font-bold outline-none focus:border-primary text-sky-600 dark:text-sky-400"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={pick("حذف السطر", "Delete line")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary/50 font-bold border-t border-border/70">
                <tr>
                  <td className="p-2.5 text-end font-black">{pick("إجمالي القيد:", "Total:")}</td>
                  <td className="p-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {money(totalDebit)}
                  </td>
                  <td className="p-2.5 font-mono font-black text-sky-600 dark:text-sky-400">
                    {money(totalCredit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Row & Balance Indicator */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <Btn type="button" variant="outline" size="sm" onClick={handleAddLine} className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              <span>{pick("إضافة سطر حساب", "Add Line")}</span>
            </Btn>
            
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                <CheckCircle2 className="size-3.5" />
                <span>{pick("القيد متزن محاسبياً بنسبة 100% (المدين = الدائن)", "Entry is 100% Balanced")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20">
                <span>{pick(`الفرق غير متزن: ${money(diff)}`, `Unbalanced difference: ${money(diff)}`)}</span>
              </span>
            )}
          </div>

          <DialogFooter className="mt-5 border-t border-border/50 pt-3">
            <Btn type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pick("إلغاء", "Cancel")}
            </Btn>
            <Btn type="submit" variant="solid" disabled={!isBalanced} className="font-bold">
              {pick("اعتماد وترحيل القيد", "Approve & Post Entry")}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
