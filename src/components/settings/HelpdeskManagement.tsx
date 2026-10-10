import { useState, useMemo, useEffect } from "react";
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Building2,
  Phone,
  User,
  ShieldAlert,
  Send,
  Trash2,
  Tag,
  Check,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, Panel, Td } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useHelpdeskStore,
  type HelpdeskTicket,
  type TicketPriority,
  type TicketStatus,
  type TicketCategory,
} from "@/lib/helpdesk-store";

interface SupportStaffMember {
  id: string;
  name: string;
  roleTitle?: string;
  departmentName?: string;
  email?: string;
}

interface CategoryOption {
  key: string;
  ar: string;
  en: string;
  isCustom?: boolean;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { key: "branch_pos", ar: "نقاط البيع والفروع (POS)", en: "Branch & POS" },
  { key: "central_kitchen", ar: "المطبخ المركزي والأفران", en: "Central Kitchen" },
  { key: "inventory_supply", ar: "المخزون وسلاسل الإمداد", en: "Inventory & Supply" },
  { key: "billing_accounting", ar: "الحسابات والفواتير", en: "Billing & Finance" },
  { key: "system_bug", ar: "أعطال النظام والشبكة", en: "System & Network" },
  { key: "general_inquiry", ar: "استفسار عام", en: "General Inquiry" },
];

export function HelpdeskManagement() {
  const { t, pick, n } = useI18n();
  const {
    tickets,
    addTicket,
    updateTicketStatus,
    assignTicket,
    addResponse,
    deleteTicket,
    resetToSeed,
  } = useHelpdeskStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // Support Staff from Supabase Database
  const [supportStaff, setSupportStaff] = useState<SupportStaffMember[]>([
    {
      id: "team-central",
      name: "فريق الدعم الفني المركزي",
      roleTitle: "مركز العمليات ونظم المعلومات",
      departmentName: "الإدارة العامة",
    },
  ]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Custom Categories from Supabase Database
  const [customCategories, setCustomCategories] = useState<CategoryOption[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatNameAr, setNewCatNameAr] = useState("");
  const [newCatNameEn, setNewCatNameEn] = useState("");
  const [isSavingCat, setIsSavingCat] = useState(false);

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("branch_pos");
  const [newPriority, setNewPriority] = useState<TicketPriority>("high");
  const [newLocation, setNewLocation] = useState("فرع الكوربة — مصر الجديدة");
  const [newSubmitter, setNewSubmitter] = useState("");
  const [newRole, setNewRole] = useState("مشرف الفرع");
  const [newPhone, setNewPhone] = useState("");
  const [newAssignee, setNewAssignee] = useState("فريق الدعم الفني المركزي");
  const [newSlaHours, setNewSlaHours] = useState(4);

  // Quick Reply inside Drawer
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [resolutionInput, setResolutionInput] = useState("");

  // Load Support Staff directly from Supabase Database (Employees + Profiles)
  useEffect(() => {
    async function loadSupportStaff() {
      setLoadingStaff(true);
      try {
        const [empRes, profRes] = await Promise.all([
          (supabase as any)
            .from("employees")
            .select("id, name_ar, name_en, email, positions(title_ar, title_en), departments(name_ar, name_en)")
            .eq("is_active", true),
          (supabase as any)
            .from("profiles")
            .select("id, full_name_ar, full_name_en, email")
            .eq("is_active", true),
        ]);

        const staffList: SupportStaffMember[] = [
          {
            id: "team-central",
            name: "فريق الدعم الفني المركزي",
            roleTitle: "مركز العمليات ونظم المعلومات",
            departmentName: "الإدارة العامة",
          },
        ];

        if (empRes.data) {
          empRes.data.forEach((e: any) => {
            const name = e.name_ar || e.name_en || e.email;
            const role = e.positions?.title_ar || e.positions?.title_en || "";
            const dept = e.departments?.name_ar || e.departments?.name_en || "";
            if (name && !staffList.some((s) => s.name === name)) {
              staffList.push({
                id: e.id,
                name,
                roleTitle: role,
                departmentName: dept,
                email: e.email,
              });
            }
          });
        }

        if (profRes.data) {
          profRes.data.forEach((p: any) => {
            const name = p.full_name_ar || p.full_name_en || p.email;
            if (name && !staffList.some((s) => s.name === name || s.email === p.email)) {
              staffList.push({
                id: p.id,
                name: name.includes("@") ? name.split("@")[0] : name,
                roleTitle: "مسؤول نظام",
                email: p.email,
              });
            }
          });
        }

        setSupportStaff(staffList);
      } catch (err) {
        console.error("Failed to load support staff from DB:", err);
      } finally {
        setLoadingStaff(false);
      }
    }

    loadSupportStaff();
  }, []);

  // Load Custom Categories from Supabase Database
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await (supabase as any)
          .from("categories")
          .select("id, code, name_ar, name_en")
          .ilike("code", "HD-CAT-%");

        if (data && !error) {
          setCustomCategories(
            data.map((c: any) => ({
              key: c.code,
              ar: c.name_ar,
              en: c.name_en || c.name_ar,
              isCustom: true,
            }))
          );
        }
      } catch (e) {
        console.warn("Could not fetch custom categories:", e);
      }
    }

    fetchCategories();
  }, []);

  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  const handleSaveNewCategory = async () => {
    const trimmedAr = newCatNameAr.trim();
    if (!trimmedAr) return;
    setIsSavingCat(true);
    const code = `HD-CAT-${Date.now()}`;
    const trimmedEn = newCatNameEn.trim() || trimmedAr;

    try {
      const { data, error } = await (supabase as any)
        .from("categories")
        .insert({
          code,
          name_ar: trimmedAr,
          name_en: trimmedEn,
        })
        .select();

      if (!error && data?.[0]) {
        const added: CategoryOption = {
          key: code,
          ar: trimmedAr,
          en: trimmedEn,
          isCustom: true,
        };
        setCustomCategories((prev) => [...prev, added]);
        setNewCategory(code);
        setNewCatNameAr("");
        setNewCatNameEn("");
        setIsAddCategoryOpen(false);
      }
    } catch (err) {
      console.error("Error inserting custom category into Supabase:", err);
    } finally {
      setIsSavingCat(false);
    }
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((tkt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tkt.ticketNumber.toLowerCase().includes(q) ||
        tkt.title.toLowerCase().includes(q) ||
        tkt.submitterName.toLowerCase().includes(q) ||
        tkt.branchOrLocation.toLowerCase().includes(q) ||
        tkt.assignedTo.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || tkt.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || tkt.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || tkt.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, open, inProgress, urgent, resolved, rate };
  }, [tickets]);

  // Keep selected ticket updated with store changes
  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return tickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [tickets, selectedTicket]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTicket({
      title: newTitle.trim(),
      description: newDesc.trim() || newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: "open",
      branchOrLocation: newLocation,
      submitterName: newSubmitter.trim() || "موظف مسؤول",
      submitterRole: newRole.trim() || "طاقم العمل",
      submitterPhone: newPhone.trim(),
      assignedTo: newAssignee.trim() || "مهندس الدعم المناوب",
      slaDueHours: newSlaHours,
    });

    setIsNewTicketOpen(false);
    setNewTitle("");
    setNewDesc("");
    setNewSubmitter("");
    setNewPhone("");
  };

  const handleSendReply = () => {
    if (!activeTicket || !replyMessage.trim()) return;
    addResponse(activeTicket.id, {
      sender: "مسؤول النظام (Admin)",
      senderRole: "مدير الدعم الفني",
      message: replyMessage.trim(),
      isInternal: isInternalNote,
    });
    setReplyMessage("");
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "urgent":
        return {
          bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
          label: pick("عاجل جداً (طارئ)", "Urgent"),
          dot: "bg-rose-500 animate-pulse",
        };
      case "high":
        return {
          bg: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
          label: pick("مرتفع", "High"),
          dot: "bg-orange-500",
        };
      case "medium":
        return {
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
          label: pick("متوسط", "Medium"),
          dot: "bg-amber-500",
        };
      case "low":
      default:
        return {
          bg: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
          label: pick("منخفض", "Low"),
          dot: "bg-slate-500",
        };
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "open":
        return {
          bg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
          label: pick("مفتوحة بانتظار الفحص", "Open"),
        };
      case "in_progress":
        return {
          bg: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
          label: pick("قيد المعالجة والحل", "In Progress"),
        };
      case "resolved":
        return {
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
          label: pick("تم الحل بنجاح", "Resolved"),
        };
      case "closed":
      default:
        return {
          bg: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
          label: pick("مغلقة ومؤرشفة", "Closed"),
        };
    }
  };

  const getCategoryLabel = (c: TicketCategory) => {
    const found = allCategories.find((cat) => cat.key === c || cat.ar === c || cat.en === c);
    if (found) {
      return pick(found.ar, found.en);
    }
    return c;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <LifeBuoy className="size-5 text-primary" />
            <span>{pick("مركز الدعم الفني والتذاكر الموحد (Helpdesk)", "Unified Helpdesk & Support Tickets")}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pick(
              "متابعة شكاوى وأعطال الفروع، طلبات المطبخ المركزي، مشكلات نقاط البيع، واتفاقيات مستوى الخدمة (SLA)",
              "Track branch IT tickets, central kitchen issues, POS breakdowns, and service level agreements (SLA)"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={resetToSeed} className="text-xs">
            <RefreshCw className="size-3.5" />
            <span>{pick("استعادة التذاكر النموذجية", "Reset Samples")}</span>
          </Btn>
          <Btn variant="solid" size="sm" onClick={() => setIsNewTicketOpen(true)} className="text-xs">
            <Plus className="size-4" />
            <span>{pick("فتح تذكرة دعم جديدة", "New Ticket")}</span>
          </Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{pick("إجمالي التذاكر", "Total Tickets")}</span>
            <LifeBuoy className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{n(stats.total)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {stats.open} {pick("تذكرة جديدة", "new")}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{pick("قيد المتابعة والعمل", "In Progress")}</span>
            <Clock className="size-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {n(stats.inProgress)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {pick("جاري حلها بالدعم", "Active handling")}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{pick("تذاكر عاجلة طارئة", "Urgent SLA")}</span>
            <AlertCircle className="size-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {n(stats.urgent)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
            {pick("أولوية قصوى للفروع", "Immediate attention")}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{pick("نسبة الإنجاز والحل", "Resolution Rate")}</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {n(stats.rate)}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {stats.resolved} {pick("تذكرة منجزة", "resolved")}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick("بحث برقم التذكرة، العنوان، الفرع، أو صاحب الطلب...", "Search ticket #, title, branch, submitter...")}
              className="w-full text-xs ps-9 pe-3 py-2 rounded-lg bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-lg bg-background border border-border/80 focus:outline-none"
            >
              <option value="all">{pick("جميع الحالات", "All Statuses")}</option>
              <option value="open">{pick("مفتوحة", "Open")}</option>
              <option value="in_progress">{pick("قيد المعالجة", "In Progress")}</option>
              <option value="resolved">{pick("تم الحل", "Resolved")}</option>
              <option value="closed">{pick("مغلقة", "Closed")}</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-lg bg-background border border-border/80 focus:outline-none"
            >
              <option value="all">{pick("كافة الأولويات", "All Priorities")}</option>
              <option value="urgent">{pick("عاجل جداً", "Urgent")}</option>
              <option value="high">{pick("مرتفع", "High")}</option>
              <option value="medium">{pick("متوسط", "Medium")}</option>
              <option value="low">{pick("منخفض", "Low")}</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-lg bg-background border border-border/80 focus:outline-none"
            >
              <option value="all">{pick("كافة التصنيفات", "All Categories")}</option>
              {allCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {pick(c.ar, c.en)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="border border-border/70 rounded-xl overflow-hidden bg-card/40">
        <DataTable
          head={[
            pick("رقم التذكرة والموضوع", "Ticket & Subject"),
            pick("القسم والموقع", "Category & Location"),
            pick("مقدم البلاغ", "Submitter"),
            pick("الأولوية", "Priority"),
            pick("الحالة", "Status"),
            pick("المسؤول", "Assigned To"),
            pick("الإجراءات", "Actions"),
          ]}
        >
          {filteredTickets.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                {pick("لا توجد تذاكر تطابق معايير البحث المحددة.", "No tickets match your filter criteria.")}
              </td>
            </tr>
          ) : (
            filteredTickets.map((tkt) => {
              const pBadge = getPriorityBadge(tkt.priority);
              const sBadge = getStatusBadge(tkt.status);

              return (
                <tr
                  key={tkt.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicket(tkt)}
                >
                  <Td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {tkt.ticketNumber}
                      </span>
                      {tkt.responses.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-mono">
                          <MessageSquare className="size-2.5" />
                          {tkt.responses.length}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-foreground mt-0.5 max-w-sm line-clamp-1">
                      {tkt.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {tkt.createdAt}
                    </div>
                  </Td>

                  <Td className="py-3 px-4">
                    <div className="text-xs font-medium text-foreground">
                      {getCategoryLabel(tkt.category)}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="size-3 text-muted-foreground" />
                      <span>{tkt.branchOrLocation}</span>
                    </div>
                  </Td>

                  <Td className="py-3 px-4">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <User className="size-3 text-muted-foreground" />
                      <span>{tkt.submitterName}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {tkt.submitterRole}
                    </div>
                  </Td>

                  <Td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        pBadge.bg
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", pBadge.dot)} />
                      {pBadge.label}
                    </span>
                  </Td>

                  <Td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        sBadge.bg
                      )}
                    >
                      {sBadge.label}
                    </span>
                  </Td>

                  <Td className="py-3 px-4 text-xs font-medium text-foreground">
                    {tkt.assignedTo}
                  </Td>

                  <td className="py-3 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Btn
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(tkt)}
                        className="text-xs h-7 px-2"
                      >
                        <MessageSquare className="size-3" />
                        <span>{pick("عرض والمتابعة", "View")}</span>
                      </Btn>
                      <button
                        onClick={() => deleteTicket(tkt.id)}
                        className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                        title={pick("حذف التذكرة", "Delete Ticket")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Ticket Details & Discussion Modal */}
      <Dialog open={!!activeTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-5">
          {activeTicket && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">
                        {activeTicket.ticketNumber}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getPriorityBadge(activeTicket.priority).bg)}>
                        {getPriorityBadge(activeTicket.priority).label}
                      </span>
                    </div>
                    <DialogTitle className="text-base font-bold text-foreground mt-1 text-start">
                      {activeTicket.title}
                    </DialogTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{pick("تغيير الحالة:", "Status:")}</span>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value as TicketStatus)}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-background border border-border font-medium focus:outline-none"
                    >
                      <option value="open">{pick("مفتوحة", "Open")}</option>
                      <option value="in_progress">{pick("قيد المعالجة", "In Progress")}</option>
                      <option value="resolved">{pick("تم الحل", "Resolved")}</option>
                      <option value="closed">{pick("مغلقة", "Closed")}</option>
                    </select>
                  </div>
                </div>
              </DialogHeader>

              {/* Submitter & Location Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("الموقع / الفرع", "Branch")}</span>
                  <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3 text-primary" />
                    {activeTicket.branchOrLocation}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("مقدم البلاغ", "Submitter")}</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {activeTicket.submitterName} ({activeTicket.submitterRole})
                  </span>
                  {activeTicket.submitterPhone && (
                    <span className="text-muted-foreground font-mono text-[11px] block">
                      {activeTicket.submitterPhone}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("المسؤول بالدعم", "Assigned To")}</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {activeTicket.assignedTo}
                  </span>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">{pick("تفاصيل البلاغ والطلب:", "Ticket Description:")}</h4>
                <div className="p-3 rounded-lg bg-background border border-border/80 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {activeTicket.description}
                </div>
              </div>

              {/* Resolution Notes if Resolved */}
              {activeTicket.resolutionNotes && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>{pick("ملاحظات إتمام الحل والإغلاق:", "Resolution Summary:")}</span>
                  </div>
                  <div>{activeTicket.resolutionNotes}</div>
                </div>
              )}

              {/* Discussion Thread */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-primary" />
                  <span>{pick("سجل المتابعة والردود الفنية:", "Updates & Discussion Thread:")}</span>
                </h4>

                {activeTicket.responses.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    {pick("لا توجد ردود بعد. يمكنك كتابة أول رد فني بالأسفل.", "No responses yet. Add the first reply below.")}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
                    {activeTicket.responses.map((resp) => (
                      <div
                        key={resp.id}
                        className={cn(
                          "p-3 rounded-xl border text-xs space-y-1",
                          resp.isInternal
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                            : "bg-muted/40 border-border/70 text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold flex items-center gap-1.5">
                            {resp.sender}
                            <span className="font-normal text-muted-foreground">({resp.senderRole})</span>
                            {resp.isInternal && (
                              <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded text-[10px]">
                                {pick("ملاحظة داخلية", "Internal Note")}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-muted-foreground">{resp.timestamp}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{pick("إضافة رد فني أو متابعة:", "Add Response / Update:")}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{pick("ملاحظة داخلية (لفريق الدعم فقط)", "Internal note (Support only)")}</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={pick("اكتب التحديث أو الإجراء الذي تم اتخاذه هنا...", "Write update or action taken here...")}
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-end">
                    <Btn variant="solid" size="sm" onClick={handleSendReply} disabled={!replyMessage.trim()} className="text-xs">
                      <Send className="size-3.5" />
                      <span>{pick("إرسال الرد", "Send Reply")}</span>
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Support Ticket Modal */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              <span>{pick("فتح تذكرة دعم فني جديدة", "Create Support Ticket")}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {pick("عنوان التذكرة / المشكلة *", "Ticket Subject / Issue Title *")}
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={pick("مثال: عطل في شاشة الكاشير / نقص خامات عاجل", "e.g., POS terminal touch screen failure")}
                className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category with Add Option & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    {pick("التصنيف *", "Category *")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen((prev) => !prev)}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="size-3" />
                    <span>{pick("إضافة تصنيف جديد", "+ Add Category")}</span>
                  </button>
                </div>

                {/* Inline New Category Creation Box */}
                {isAddCategoryOpen && (
                  <div className="p-2.5 mb-2 rounded-lg bg-primary/5 border border-primary/20 space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="size-3.5 text-primary" />
                      <span>{pick("إضافة تصنيف دعم فني جديد", "Add New Support Category")}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <input
                        type="text"
                        value={newCatNameAr}
                        onChange={(e) => setNewCatNameAr(e.target.value)}
                        placeholder={pick("اسم التصنيف بالعربية (مثال: الصيانة الدورية)", "Category name in Arabic")}
                        className="w-full text-xs p-1.5 rounded-md bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={newCatNameEn}
                        onChange={(e) => setNewCatNameEn(e.target.value)}
                        placeholder={pick("اسم التصنيف بالإنجليزية (اختياري)", "Category name in English (optional)")}
                        className="w-full text-xs p-1.5 rounded-md bg-background border border-border/80 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Btn
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddCategoryOpen(false)}
                        className="text-[11px] h-7 px-2"
                      >
                        {pick("إلغاء", "Cancel")}
                      </Btn>
                      <Btn
                        type="button"
                        variant="solid"
                        size="sm"
                        onClick={handleSaveNewCategory}
                        disabled={!newCatNameAr.trim() || isSavingCat}
                        className="text-[11px] h-7 px-3"
                      >
                        {isSavingCat ? <RefreshCw className="size-3 animate-spin" /> : <Check className="size-3" />}
                        <span>{pick("حفظ التصنيف", "Save Category")}</span>
                      </Btn>
                    </div>
                  </div>
                )}

                <select
                  value={newCategory}
                  onChange={(e) => {
                    if (e.target.value === "__add_new__") {
                      setIsAddCategoryOpen(true);
                    } else {
                      setNewCategory(e.target.value as TicketCategory);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                >
                  <optgroup label={pick("التصنيفات الأساسية", "Standard Categories")}>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {pick(cat.ar, cat.en)}
                      </option>
                    ))}
                  </optgroup>
                  {customCategories.length > 0 && (
                    <optgroup label={pick("التصنيفات المضافة (قاعدة البيانات)", "Custom Categories (DB)")}>
                      {customCategories.map((cat) => (
                        <option key={cat.key} value={cat.key}>
                          {pick(cat.ar, cat.en)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__add_new__" className="text-primary font-semibold">
                    {pick("➕ إضافة تصنيف جديد...", "➕ Add New Category...")}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {pick("مستوى الأولوية *", "Priority *")}
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                >
                  <option value="urgent">{pick("عاجل جداً (طارئ - ساعتين)", "Urgent (2h SLA)")}</option>
                  <option value="high">{pick("مرتفع (4 ساعات)", "High (4h SLA)")}</option>
                  <option value="medium">{pick("متوسط (8 ساعات)", "Medium (8h SLA)")}</option>
                  <option value="low">{pick("منخفض (24 ساعة)", "Low (24h SLA)")}</option>
                </select>
              </div>
            </div>

            {/* Facility & Support Assignee (Fetched from DB) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {pick("الفرع أو المنشأة *", "Branch or Facility *")}
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                >
                  <option value="فرع الكوربة — مصر الجديدة">فرع الكوربة — مصر الجديدة</option>
                  <option value="فرع المعادي — شارع النصر">فرع المعادي — شارع النصر</option>
                  <option value="فرع التجمع الخامس — التسعين">فرع التجمع الخامس — التسعين</option>
                  <option value="المطبخ المركزي ومصنع العاشر">المطبخ المركزي ومصنع العاشر</option>
                  <option value="مستودع التبريد والخامات المركزي">مستودع التبريد والخامات المركزي</option>
                  <option value="المقر الإداري الرئيسي">المقر الإداري الرئيسي</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    {pick("المسؤول بالدعم *", "Support Assignee *")}
                  </label>
                  {loadingStaff && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="size-2.5 animate-spin" />
                      {pick("جاري التحميل...", "Loading...")}
                    </span>
                  )}
                </div>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                >
                  {supportStaff.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name} {staff.roleTitle ? `— ${staff.roleTitle}` : staff.departmentName ? `— ${staff.departmentName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {pick("اسم مقدم البلاغ *", "Submitter Name *")}
                </label>
                <input
                  type="text"
                  required
                  value={newSubmitter}
                  onChange={(e) => setNewSubmitter(e.target.value)}
                  placeholder="أحمد حسني"
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {pick("المسمى الوظيفي", "Role")}
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="مشرف الوردية"
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {pick("رقم الهاتف", "Phone")}
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+20 102 000 0000"
                  className="w-full text-xs p-2 rounded-lg bg-background border border-border/80 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {pick("تفاصيل المشكلة كاملة *", "Problem Description *")}
              </label>
              <textarea
                required
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={pick("يرجى ذكر تفاصيل العطل، الخطوات المتبعة، وأي رسائل خطأ ظهرت...", "Describe symptoms, error messages, and actions taken...")}
                className="w-full text-xs p-2.5 rounded-lg bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Btn type="button" variant="outline" size="sm" onClick={() => setIsNewTicketOpen(false)} className="text-xs">
                {pick("إلغاء", "Cancel")}
              </Btn>
              <Btn type="submit" variant="solid" size="sm" className="text-xs">
                <Check className="size-4" />
                <span>{pick("حفظ وفتح التذكرة", "Submit Ticket")}</span>
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
