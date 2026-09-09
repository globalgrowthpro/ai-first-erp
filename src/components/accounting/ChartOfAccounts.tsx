import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  FolderTree,
  ChevronsUpDown,
  ChevronsDownUp,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, KpiCard, Panel } from "@/components/kit";
import {
  chartOfAccounts as initialAccounts,
  type AccountItem,
  type AccountType,
  type NormalBalance,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ChartOfAccounts() {
  const { t, pick, money, dir } = useI18n();
  const [accounts, setAccounts] = useState<AccountItem[]>(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | AccountType>("all");
  const [collapsedCodes, setCollapsedCodes] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [parentForNewAccount, setParentForNewAccount] = useState<string>("");

  // New account form state
  const [newCode, setNewCode] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newType, setNewType] = useState<AccountType>("asset");
  const [newNormalBalance, setNewNormalBalance] = useState<NormalBalance>("debit");
  const [newBalance, setNewBalance] = useState<number>(0);

  // Financial summary metrics
  const summary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let revenue = 0;
    let expenses = 0;

    for (const acc of accounts) {
      if (acc.level === 1) {
        if (acc.type === "asset") assets += acc.balance;
        if (acc.type === "liability") liabilities += acc.balance;
        if (acc.type === "equity") equity += acc.balance;
        if (acc.type === "revenue") revenue += acc.balance;
        if (acc.type === "expense") expenses += acc.balance;
      }
    }
    const netIncome = revenue - expenses;
    return { assets, liabilities, equity, netIncome };
  }, [accounts]);

  // Set of all parent codes
  const parentCodes = useMemo(() => {
    const set = new Set<string>();
    for (const acc of accounts) {
      if (acc.isParent) set.add(acc.code);
    }
    return set;
  }, [accounts]);

  // Expand / collapse single row
  const toggleCollapse = (code: string) => {
    setCollapsedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedCodes(new Set());
  const collapseAll = () => setCollapsedCodes(new Set(parentCodes));

  // Determine if an account's ancestor is collapsed
  const isHiddenByParentCollapse = (item: AccountItem): boolean => {
    if (searchQuery.trim() || selectedType !== "all") return false; // show flat/direct when filtering
    let curr = item;
    while (curr.parentId) {
      if (collapsedCodes.has(curr.parentId)) return true;
      const parent = accounts.find((a) => a.code === curr.parentId);
      if (!parent) break;
      curr = parent;
    }
    return false;
  };

  // Filter accounts by search and type
  const visibleAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (isHiddenByParentCollapse(acc)) return false;

      const matchesType = selectedType === "all" || acc.type === selectedType;
      if (!matchesType) return false;

      if (!query) return true;
      return (
        acc.code.toLowerCase().includes(query) ||
        acc.name.ar.toLowerCase().includes(query) ||
        acc.name.en.toLowerCase().includes(query)
      );
    });
  }, [accounts, searchQuery, selectedType, collapsedCodes]);

  const openAddModal = (parentId?: string) => {
    if (parentId) {
      const parent = accounts.find((a) => a.code === parentId);
      if (parent) {
        setParentForNewAccount(parentId);
        setNewType(parent.type);
        setNewNormalBalance(parent.normalBalance);
        // Suggest child code
        const siblings = accounts.filter((a) => a.parentId === parentId);
        const nextNum = siblings.length + 1;
        setNewCode(`${parentId}${nextNum}`);
      }
    } else {
      setParentForNewAccount("");
      setNewCode("");
    }
    setNewNameAr("");
    setNewNameEn("");
    setNewBalance(0);
    setIsAddModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || (!newNameAr.trim() && !newNameEn.trim())) return;

    const parent = parentForNewAccount
      ? accounts.find((a) => a.code === parentForNewAccount)
      : undefined;

    const newAccountItem: AccountItem = {
      code: newCode.trim(),
      name: {
        ar: newNameAr.trim() || newNameEn.trim(),
        en: newNameEn.trim() || newNameAr.trim(),
      },
      type: parent ? parent.type : newType,
      normalBalance: parent ? parent.normalBalance : newNormalBalance,
      balance: Number(newBalance) || 0,
      parentId: parent ? parent.code : undefined,
      level: parent ? parent.level + 1 : 1,
      isParent: false,
      status: "active",
    };

    setAccounts((prev) => {
      // Mark parent as isParent if it wasn't
      const updated = prev.map((a) =>
        a.code === parentForNewAccount ? { ...a, isParent: true } : a,
      );
      return [...updated, newAccountItem].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true }),
      );
    });

    setIsAddModalOpen(false);
  };

  const getTypeBadge = (type: AccountType) => {
    switch (type) {
      case "asset":
        return "bg-brand/15 text-brand border-brand/40";
      case "liability":
        return "bg-gold/20 text-gold-foreground border-gold/50";
      case "equity":
        return "bg-primary/15 text-primary border-primary/40";
      case "revenue":
        return "bg-success/15 text-success border-success/40";
      case "expense":
        return "bg-destructive/15 text-destructive border-destructive/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("totalAssets")}
          value={money(summary.assets)}
          accent="brand"
        />
        <KpiCard
          label={t("totalLiabilities")}
          value={money(summary.liabilities)}
          accent="gold"
        />
        <KpiCard
          label={t("totalEquity")}
          value={money(summary.equity)}
          accent="primary"
        />
        <KpiCard
          label={t("netIncome")}
          value={money(summary.netIncome)}
          accent={summary.netIncome >= 0 ? "primary" : "ink"}
        />
      </div>

      {/* Main Panel: Chart of Accounts Table & Controls */}
      <Panel
        title={t("chartOfAccounts")}
        aside={
          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={expandAll}
              title={t("expandAll")}
            >
              <ChevronsUpDown className="size-3.5" />
              <span className="hidden sm:inline">{t("expandAll")}</span>
            </Btn>
            <Btn
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={collapseAll}
              title={t("collapseAll")}
            >
              <ChevronsDownUp className="size-3.5" />
              <span className="hidden sm:inline">{t("collapseAll")}</span>
            </Btn>
            <Btn
              variant="solid"
              className="h-8 px-3 text-xs"
              onClick={() => openAddModal()}
            >
              <Plus className="size-3.5" />
              {t("newAccount")}
            </Btn>
          </div>
        }
      >
        {/* Toolbar: Search and Filter Pills */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground", dir === "rtl" ? "right-3" : "left-3")} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchAccounts")}
              className={cn(
                "w-full rounded-lg border border-border bg-card py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                dir === "rtl" ? "pr-9 pl-8" : "pl-9 pr-8",
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", dir === "rtl" ? "left-2.5" : "right-2.5")}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {(
              [
                { key: "all", label: t("allTypes") },
                { key: "asset", label: t("assets") },
                { key: "liability", label: t("liabilities") },
                { key: "equity", label: t("equity") },
                { key: "revenue", label: t("revenue") },
                { key: "expense", label: t("expenses") },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedType(item.key)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 uppercase transition-all",
                  selectedType === item.key
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tree Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 text-start">
                <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-24">
                  {t("accountCode")}
                </th>
                <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("accountName")}
                </th>
                <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-28">
                  {t("accountType")}
                </th>
                <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-28">
                  {t("normalBalance")}
                </th>
                <th className="px-3 py-2 text-end text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-36">
                  {t("currentBalance")}
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-20">
                  {t("status")}
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-24">
                  {t("action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {pick("لا توجد حسابات مطابقة لمعايير البحث", "No accounts match the criteria")}
                  </td>
                </tr>
              ) : (
                visibleAccounts.map((acc) => {
                  const isParent = acc.isParent;
                  const isCollapsed = collapsedCodes.has(acc.code);
                  const indentLevel = acc.level - 1;

                  return (
                    <tr
                      key={acc.code}
                      className={cn(
                        "group border-b border-border transition-colors hover:bg-secondary/70",
                        acc.level === 1 && "bg-muted/40 font-bold",
                        acc.level === 2 && "font-semibold",
                      )}
                    >
                      {/* Code */}
                      <td className="px-3 py-2.5 num font-bold text-foreground">
                        <span className={cn(
                          "inline-block rounded-md px-1.5 py-0.5 border border-border text-xs font-mono",
                          acc.level === 1 && "bg-secondary/80 text-foreground font-bold border-border/80",
                          acc.level === 2 && "bg-secondary/40 text-foreground",
                        )}>
                          {acc.code}
                        </span>
                      </td>

                      {/* Name with hierarchical indent & chevron */}
                      <td className="px-3 py-2.5">
                        <div
                          className="flex items-center gap-1.5"
                          style={{
                            [dir === "rtl" ? "marginRight" : "marginLeft"]: `${indentLevel * 20}px`,
                          }}
                        >
                          {isParent ? (
                            <button
                              type="button"
                              onClick={() => toggleCollapse(acc.code)}
                              className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-secondary transition-colors"
                            >
                              {isCollapsed ? (
                                <ChevronRight className={cn("size-3.5", dir === "rtl" && "rotate-180")} />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block size-5 shrink-0" />
                          )}
                          <span
                            className={cn(
                              "truncate",
                              acc.level === 1 && "text-base font-bold",
                              acc.level > 2 && "text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            {pick(acc.name.ar, acc.name.en)}
                          </span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                            getTypeBadge(acc.type),
                          )}
                        >
                          {t(acc.type === "asset" ? "assets" : acc.type === "liability" ? "liabilities" : acc.type)}
                        </span>
                      </td>

                      {/* Normal Balance */}
                      <td className="px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground">
                        {t(acc.normalBalance)}
                      </td>

                      {/* Current Balance */}
                      <td className={cn(
                        "px-3 py-2.5 text-end num font-bold",
                        acc.balance < 0 ? "text-destructive" : "text-foreground",
                        acc.level === 1 && "text-base font-extrabold",
                      )}>
                        {money(acc.balance)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block rounded-md border border-success/30 bg-success/15 text-success px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {t("active")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => openAddModal(acc.code)}
                          title={t("addSubAccount")}
                          className="inline-flex items-center justify-center rounded-md border border-border bg-card p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Add Account Modal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="border border-border/80 shadow-2xl rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {parentForNewAccount
                ? `${t("addSubAccount")} (${parentForNewAccount})`
                : t("newAccount")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAccount} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {t("parentAccount")}
              </label>
              <select
                value={parentForNewAccount}
                onChange={(e) => {
                  const val = e.target.value;
                  setParentForNewAccount(val);
                  if (val) {
                    const parent = accounts.find((a) => a.code === val);
                    if (parent) {
                      setNewType(parent.type);
                      setNewNormalBalance(parent.normalBalance);
                    }
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">-- {t("selectParent")} --</option>
                {accounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {pick(acc.name.ar, acc.name.en)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("accountCode")} *
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. 1114"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("accountType")}
                </label>
                <select
                  disabled={Boolean(parentForNewAccount)}
                  value={newType}
                  onChange={(e) => {
                    const type = e.target.value as AccountType;
                    setNewType(type);
                    setNewNormalBalance(
                      type === "asset" || type === "expense" ? "debit" : "credit",
                    );
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="asset">{t("assets")}</option>
                  <option value="liability">{t("liabilities")}</option>
                  <option value="equity">{t("equity")}</option>
                  <option value="revenue">{t("revenue")}</option>
                  <option value="expense">{t("expenses")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {t("accountNameAr")} *
              </label>
              <input
                type="text"
                required
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
                placeholder="مثال: حساب البنك الأهلي فرع المعادي"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {t("accountNameEn")}
              </label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g. NBE Bank Maadi Branch"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("normalBalance")}
                </label>
                <select
                  disabled={Boolean(parentForNewAccount)}
                  value={newNormalBalance}
                  onChange={(e) => setNewNormalBalance(e.target.value as NormalBalance)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="debit">{t("debit")}</option>
                  <option value="credit">{t("credit")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("openingBalance")}
                </label>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Btn
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                {t("cancel")}
              </Btn>
              <Btn type="submit" variant="solid">
                {t("save")}
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
