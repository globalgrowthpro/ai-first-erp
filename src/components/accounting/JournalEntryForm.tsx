import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useJournalStore, useAccountsStore } from "@/lib/accounting-store";
import { Plus, Trash2 } from "lucide-react";

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalEntryForm({ open, onOpenChange }: JournalEntryFormProps) {
  const { t, pick, money } = useI18n();
  const { addEntries } = useJournalStore();
  const { accounts } = useAccountsStore();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<{ accountCode: string; debit: number; credit: number }[]>([
    { accountCode: "", debit: 0, credit: 0 },
    { accountCode: "", debit: 0, credit: 0 },
  ]);

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountCode: "", debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: "accountCode" | "debit" | "credit", value: string | number) => {
    setLines(prev => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      const target = { ...copy[index] };
      if (field === "accountCode") target.accountCode = String(value);
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

    const id = `JE-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newEntries = lines.filter(l => l.accountCode && (l.debit > 0 || l.credit > 0)).map(line => {
      const account = accounts.find(a => a.code === line.accountCode);
      return {
        id,
        date,
        account: account ? account.name : { ar: line.accountCode, en: line.accountCode },
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      };
    });

    if (newEntries.length > 0) {
      addEntries(newEntries);
      onOpenChange(false);
      setLines([{ accountCode: "", debit: 0, credit: 0 }, { accountCode: "", debit: 0, credit: 0 }]);
    }
  };

  // Only allow posting to child accounts
  const selectableAccounts = accounts.filter(a => !a.isParent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir={pick("rtl", "ltr")}>
        <DialogHeader>
          <DialogTitle>{pick("إضافة قيد يومية", "Add Journal Entry")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("date")}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary max-w-[200px]"
            />
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-2 text-start font-medium">{t("account")}</th>
                  <th className="p-2 text-start font-medium w-32">{t("debit")}</th>
                  <th className="p-2 text-start font-medium w-32">{t("credit")}</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleChange(idx, "accountCode", e.target.value)}
                        required
                        className="w-full rounded border border-border/60 bg-background p-1.5 text-xs outline-none focus:border-primary"
                      >
                        <option value="">{pick("-- اختر الحساب --", "-- Select Account --")}</option>
                        {selectableAccounts.map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {pick(a.name.ar, a.name.en)}
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
                        className="w-full rounded border border-border/60 bg-background p-1.5 text-xs outline-none focus:border-primary font-mono"
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
                        className="w-full rounded border border-border/60 bg-background p-1.5 text-xs outline-none focus:border-primary font-mono"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {lines.length > 2 && (
                        <button type="button" onClick={() => handleRemoveLine(idx)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary/30 font-bold border-t border-border/60">
                <tr>
                  <td className="p-2 text-end">{pick("الإجمالي:", "Total:")}</td>
                  <td className={`p-2 font-mono ${totalDebit !== totalCredit ? 'text-rose-500' : 'text-emerald-600'}`}>{money(totalDebit)}</td>
                  <td className={`p-2 font-mono ${totalDebit !== totalCredit ? 'text-rose-500' : 'text-emerald-600'}`}>{money(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Btn type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="size-4" />
              {pick("إضافة سطر", "Add Line")}
            </Btn>
            
            {!isBalanced && (
              <span className="text-xs font-bold text-rose-500">
                {pick("القيود غير متوازنة!", "Entries are not balanced!")}
              </span>
            )}
          </div>

          <DialogFooter className="mt-6 border-t border-border/40 pt-4">
            <Btn type="button" variant="outline" onClick={() => onOpenChange(false)}>{pick("إلغاء", "Cancel")}</Btn>
            <Btn type="submit" variant="solid" disabled={!isBalanced}>{pick("حفظ القيد", "Save Entry")}</Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
