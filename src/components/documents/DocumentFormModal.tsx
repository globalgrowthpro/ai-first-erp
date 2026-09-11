import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BizDocument, DocumentStatus } from "@/lib/documents-store";

interface DocumentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BizDocument | null;
  suggestedCode: string;
  kind: "sales" | "purchases";
  onSave: (doc: Omit<BizDocument, "id"> & { id?: string }) => void;
}

export function DocumentFormModal({
  open,
  onOpenChange,
  editing,
  suggestedCode,
  kind,
  onSave,
}: DocumentFormModalProps) {
  const { pick, dir } = useI18n();

  const [code, setCode] = useState("");
  const [partyAr, setPartyAr] = useState("");
  const [partyEn, setPartyEn] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [status, setStatus] = useState<DocumentStatus>("draft");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCode(editing.id);
      setPartyAr(editing.party.ar);
      setPartyEn(editing.party.en);
      setDate(editing.date);
      setAmount(editing.amount);
      setBalance(editing.balance);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
    } else {
      setCode(suggestedCode);
      setPartyAr("");
      setPartyEn("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount(0);
      setBalance(0);
      setStatus("draft");
      setNotes("");
    }
  }, [open, editing, suggestedCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyAr.trim() && !partyEn.trim()) return;
    onSave({
      id: code.trim(),
      party: {
        ar: partyAr.trim() || partyEn.trim(),
        en: partyEn.trim() || partyAr.trim(),
      },
      date: date || new Date().toISOString().slice(0, 10),
      amount: Number(amount) || 0,
      balance: Number(balance) || 0,
      status,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  const partyLabel =
    kind === "sales"
      ? pick({ ar: "العميل", en: "Customer" })
      : pick({ ar: "المورد", en: "Supplier" });

  const title = editing
    ? kind === "sales"
      ? pick({ ar: "تعديل فاتورة بيع", en: "Edit Sales Invoice" })
      : pick({ ar: "تعديل أمر شراء", en: "Edit Purchase Order" })
    : kind === "sales"
      ? pick({ ar: "فاتورة بيع جديدة", en: "New Sales Invoice" })
      : pick({ ar: "أمر شراء جديد", en: "New Purchase Order" });

  const inputCls =
    "w-full h-9 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 shadow-xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          <div>
            <label className="block font-medium mb-1 text-muted-foreground">
              {pick({ ar: "رقم المستند", en: "Document No." })}
            </label>
            <input
              type="text"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputCls} font-mono font-bold`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {partyLabel} ({pick({ ar: "عربي", en: "AR" })}) *
              </label>
              <input
                type="text"
                required
                dir="rtl"
                value={partyAr}
                onChange={(e) => setPartyAr(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {partyLabel} ({pick({ ar: "إنجليزي", en: "EN" })})
              </label>
              <input
                type="text"
                dir="ltr"
                value={partyEn}
                onChange={(e) => setPartyEn(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {pick({ ar: "التاريخ", en: "Date" })}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {pick({ ar: "الإجمالي", en: "Amount" })}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAmount(v);
                  if (balance > v) setBalance(v);
                }}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {pick({ ar: "المتبقي", en: "Balance" })}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1 text-muted-foreground">
              {pick({ ar: "الحالة", en: "Status" })}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DocumentStatus)}
              className={inputCls}
            >
              <option value="draft">{pick({ ar: "مسودة", en: "Draft" })}</option>
              <option value="partial">{pick({ ar: "سداد جزئي", en: "Partial" })}</option>
              <option value="paid">{pick({ ar: "مسدد", en: "Paid" })}</option>
              <option value="overdue">{pick({ ar: "متأخر", en: "Overdue" })}</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1 text-muted-foreground">
              {pick({ ar: "ملاحظات", en: "Notes" })}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {pick({ ar: "إلغاء", en: "Cancel" })}
            </Btn>
            <Btn type="submit" size="sm">
              {editing ? pick({ ar: "حفظ التعديل", en: "Save changes" }) : pick({ ar: "حفظ", en: "Save" })}
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  const { pick, dir } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 shadow-xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-destructive">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {pick({ ar: "إلغاء", en: "Cancel" })}
          </Btn>
          <Btn variant="danger" size="sm" onClick={onConfirm}>
            {pick({ ar: "حذف نهائي", en: "Delete" })}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
