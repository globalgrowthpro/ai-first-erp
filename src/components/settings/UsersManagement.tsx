import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { CURRENT_USER_ID, setSidebarVisible } from "@/lib/ui-prefs";
import { useOrgStore } from "@/lib/org-store";
import { ConfirmDeleteDialog } from "@/components/documents/DocumentFormModal";
import { toast } from "sonner";
import {
  systemPages,
  systemActions,
  type UserItem,
  type DepartmentItem,
  type PositionItem,
  type RoleItem,
} from "@/lib/demo-data";
import {
  Users,
  UserPlus,
  Building2,
  Briefcase,
  Shield,
  ShieldCheck,
  Search,
  Plus,
  Check,
  X,
  Layers,
  KeyRound,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
  Power,
  Trash2,
  Edit2,
} from "lucide-react";

export const AVAILABLE_ROLES = [
  { value: "admin", ar: "Admin (مدير نظام / إدارة عليا)", en: "Admin (Administrator)" },
  { value: "hr", ar: "HR (الموارد البشرية)", en: "HR (Human Resources)" },
  { value: "accountant", ar: "Accountant (محاسب مالي)", en: "Accountant (Finance)" },
  { value: "purchase", ar: "Purchase (المشتريات والتوريد)", en: "Purchase (Procurement)" },
  { value: "helpdesk", ar: "Helpdesk (الدعم الفني وخدمة العملاء)", en: "Helpdesk (Support)" },
  { value: "cto", ar: "CTO (المدير التقني والتطوير)", en: "CTO (Technology Lead)" },
  { value: "branch_manager", ar: "Branch Manager (مدير فرع ونقاط بيع)", en: "Branch Manager (Retail)" },
  { value: "manager", ar: "Manager (مدير إدارة / تشغيل)", en: "Manager (Operations)" },
  { value: "chef", ar: "Chef (شيف تصنيع وحلويات)", en: "Chef (Kitchen & Pastry)" },
  { value: "sales", ar: "Sales (مبيعات وكاشير)", en: "Sales (Cashier & Rep)" },
  { value: "warehouse", ar: "Warehouse (مخازن وسلاسل إمداد)", en: "Warehouse (Stock & Supply)" },
  { value: "driver", ar: "Driver (سائق وتوزيع أسطول)", en: "Driver (Delivery & Fleet)" },
  { value: "auditor", ar: "Auditor (مراجع داخلي وجودة)", en: "Auditor (Internal Compliance)" },
  { value: "assistant", ar: "Assistant (مساعد إداري وفني)", en: "Assistant (Admin/Technical)" },
  { value: "employee", ar: "Employee (موظف عام)", en: "Employee (Staff)" },
  { value: "pos_cashier", ar: "POS Cashier (كاشير نقطة بيع فقط)", en: "POS Cashier (POS Terminal Only)" },
] as const;

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-primary text-primary-foreground border-primary";
    case "pos_cashier":
      return "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "cto":
      return "bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30";
    case "hr":
      return "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30";
    case "accountant":
    case "cfo":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "purchase":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "helpdesk":
      return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30";
    case "branch_manager":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    case "manager":
    case "kitchen":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "chef":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "sales":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "warehouse":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "driver":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    case "auditor":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    case "assistant":
      return "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30";
    case "employee":
    default:
      return "bg-muted text-muted-foreground border-border/70";
  }
}

export function UsersManagement() {
  const { lang, t, pick } = useI18n();

  // Persistent org state
  const {
    users: usersList,
    departments: deptList,
    positions: posList,
    roles: rolesList,
    addUser,
    updateUser,
    deleteUser,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addPosition,
    updatePosition,
    deletePosition,
    addRole,
    updateRole,
    deleteRole,
    refreshAll,
  } = useOrgStore();

  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "user" | "dept" | "pos" | "role"; id: string; label: string } | null
  >(null);

  const [activeTab, setActiveTab] = useState<"users" | "departments" | "positions" | "roles">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Role search & type filter
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState<"all" | "system" | "custom">("all");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserItem | null>(null);

  // Edit Modals
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [editingPos, setEditingPos] = useState<PositionItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  // New Role Form State
  const [newRole, setNewRole] = useState({
    key: "",
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    allowedPages: ["/", "/sales", "/inventory"] as string[],
    allowedActions: ["invoice.create"] as string[],
  });

  // New User Form State
  const [newUser, setNewUser] = useState({
    nameAr: "",
    nameEn: "",
    email: "",
    departmentId: "",
    positionId: "",
    role: "sales" as UserItem["role"],
    allowedPages: ["/", "/sales", "/inventory"],
    allowedActions: ["invoice.create"],
    status: "active" as "active" | "inactive",
    sidebarVisible: true,
  });

  // New Department Form State
  const [newDept, setNewDept] = useState({
    nameAr: "",
    nameEn: "",
    code: "",
    managerAr: "",
    managerEn: "",
    managerId: "",
  });

  // New Position Form State
  const [newPos, setNewPos] = useState({
    code: "",
    titleAr: "",
    titleEn: "",
    departmentId: "",
    level: "specialist" as PositionItem["level"],
  });

  // Auto-set default dept/pos when live data loads
  useEffect(() => {
    const firstDept = deptList[0];
    const firstPos = posList[0];
    if (firstDept && !newUser.departmentId) {
      setNewUser((prev) => ({ ...prev, departmentId: firstDept.id }));
    }
    if (firstPos && !newUser.positionId) {
      setNewUser((prev) => ({ ...prev, positionId: firstPos.id }));
    }
    if (firstDept && !newPos.departmentId) {
      setNewPos((prev) => ({ ...prev, departmentId: firstDept.id }));
    }
  }, [deptList, posList]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.name.ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === "all" || u.departmentId === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [usersList, searchQuery, deptFilter]);

  // Handle Add User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.nameAr || !newUser.email) return;

    const user: UserItem = {
      id: crypto.randomUUID(),
      name: { ar: newUser.nameAr, en: newUser.nameEn || newUser.nameAr },
      email: newUser.email,
      departmentId: newUser.departmentId,
      positionId: newUser.positionId,
      role: newUser.role,
      allowedPages: newUser.allowedPages,
      allowedActions: newUser.allowedActions,
      status: newUser.status,
      lastActive: lang === "ar" ? "تمت إضافته الآن" : "Just created",
      sidebarVisible: newUser.sidebarVisible,
    };

    addUser(user);
    toast.success(lang === "ar" ? "تمت إضافة المستخدم بنجاح" : "User added successfully");
    setShowAddUserModal(false);
    setNewUser({
      nameAr: "",
      nameEn: "",
      email: "",
      departmentId: deptList[0]?.id || "",
      positionId: posList[0]?.id || "",
      role: "sales",
      allowedPages: ["/", "/sales", "/inventory"],
      allowedActions: ["invoice.create"],
      status: "active",
      sidebarVisible: true,
    });
  };

  // Handle Add Department
  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.nameAr || !newDept.code) return;

    const dept: DepartmentItem & { managerId?: string } = {
      id: crypto.randomUUID(),
      name: { ar: newDept.nameAr, en: newDept.nameEn || newDept.nameAr },
      code: newDept.code.toUpperCase(),
      manager: { ar: newDept.managerAr || "غير محدد", en: newDept.managerEn || "TBD" },
      headcount: 0,
      managerId: newDept.managerId,
    };

    addDepartment(dept);
    toast.success(lang === "ar" ? "تمت إضافة القسم بنجاح" : "Department added successfully");
    setShowAddDeptModal(false);
    setNewDept({ nameAr: "", nameEn: "", code: "", managerAr: "", managerEn: "", managerId: "" });
  };

  // Handle Add Position
  const handleCreatePos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPos.titleAr) return;

    const pos: PositionItem = {
      id: crypto.randomUUID(),
      code: newPos.code || `pos-${Date.now().toString().slice(-4)}`,
      title: { ar: newPos.titleAr, en: newPos.titleEn || newPos.titleAr },
      departmentId: newPos.departmentId,
      level: newPos.level,
    };

    addPosition(pos);
    toast.success(lang === "ar" ? "تمت إضافة المسمى الوظيفي بنجاح" : "Position added successfully");
    setShowAddPosModal(false);
    setNewPos({ code: "", titleAr: "", titleEn: "", departmentId: deptList[0]?.id || "", level: "specialist" });
  };

  // Toggle Page permission for new user
  const togglePage = (path: string) => {
    setNewUser((prev) => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(path)
        ? prev.allowedPages.filter((p) => p !== path)
        : [...prev.allowedPages, path],
    }));
  };

  // Toggle Action permission for new user
  const toggleAction = (actionId: string) => {
    setNewUser((prev) => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(actionId)
        ? prev.allowedActions.filter((a) => a !== actionId)
        : [...prev.allowedActions, actionId],
    }));
  };

  // Toggle sidebar visibility for existing user
  const toggleSelectedUserSidebar = () => {
    if (!selectedUserForDetail) return;
    const next = !selectedUserForDetail.sidebarVisible;
    updateUser(selectedUserForDetail.id, { sidebarVisible: next });
    setSelectedUserForDetail((prev) => (prev ? { ...prev, sidebarVisible: next } : prev));
    if (selectedUserForDetail.id === CURRENT_USER_ID) setSidebarVisible(next);
  };

  // Handle Edit User submit
  const handleEditUserSubmit = (updatedData: Partial<UserItem>) => {
    if (!editingUser) return;
    updateUser(editingUser.id, updatedData);
    toast.success(lang === "ar" ? "تم حفظ تعديلات المستخدم بنجاح" : "User updated successfully");
    setEditingUser(null);
  };

  // Handle Edit Dept submit
  const handleEditDeptSubmit = (updatedData: Partial<DepartmentItem> & { managerId?: string }) => {
    if (!editingDept) return;
    updateDepartment(editingDept.id, updatedData);
    toast.success(lang === "ar" ? "تم حفظ تعديلات القسم بنجاح" : "Department updated successfully");
    setEditingDept(null);
  };

  // Handle Edit Pos submit
  const handleEditPosSubmit = (updatedData: Partial<PositionItem>) => {
    if (!editingPos) return;
    updatePosition(editingPos.id, updatedData);
    toast.success(lang === "ar" ? "تم حفظ تعديلات المسمى الوظيفي بنجاح" : "Position updated successfully");
    setEditingPos(null);
  };

  // Handle Create Role submit
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.nameAr || !newRole.key) return;

    const sanitizedKey = newRole.key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (rolesList.some((r) => r.key === sanitizedKey)) {
      toast.error(
        lang === "ar"
          ? "رمز هذا الدور مستخدم مسبقاً، يرجى اختيار رمز آخر"
          : "Role key already exists, please choose another"
      );
      return;
    }

    const createdRole: RoleItem = {
      id: `role-${sanitizedKey}-${Date.now().toString().slice(-4)}`,
      key: sanitizedKey,
      name: { ar: newRole.nameAr, en: newRole.nameEn || newRole.nameAr },
      description: {
        ar: newRole.descriptionAr || newRole.nameAr,
        en: newRole.descriptionEn || newRole.nameEn || newRole.nameAr,
      },
      allowedPages: newRole.allowedPages,
      allowedActions: newRole.allowedActions,
      isSystem: false,
    };

    addRole(createdRole);
    toast.success(lang === "ar" ? "تمت إضافة الدور بنجاح" : "Role created successfully");
    setShowAddRoleModal(false);
    setNewRole({
      key: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      allowedPages: ["/", "/sales", "/inventory"],
      allowedActions: ["invoice.create"],
    });
  };

  // Handle Edit Role submit
  const handleEditRoleSubmit = (updatedData: Partial<RoleItem>) => {
    if (!editingRole) return;
    updateRole(editingRole.id, updatedData);
    toast.success(lang === "ar" ? "تم حفظ تعديلات الدور بنجاح" : "Role updated successfully");
    setEditingRole(null);
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return rolesList.filter((r) => {
      const q = roleSearchQuery.toLowerCase();
      const matchesSearch =
        r.name.ar.toLowerCase().includes(q) ||
        r.name.en.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        r.description.ar.toLowerCase().includes(q) ||
        r.description.en.toLowerCase().includes(q);
      const matchesType =
        roleTypeFilter === "all"
          ? true
          : roleTypeFilter === "system"
          ? !!r.isSystem
          : !r.isSystem;
      return matchesSearch && matchesType;
    });
  }, [rolesList, roleSearchQuery, roleTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {lang === "ar" ? "إجمالي المستخدمين" : "Total Users"}
            </span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-black mt-2">{usersList.length}</p>
          <span className="text-xs text-emerald-600 font-bold">
            {usersList.filter((u) => u.status === "active").length} {lang === "ar" ? "نشط" : "Active"}
          </span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {t("departments")}
            </span>
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-black mt-2">{deptList.length}</p>
          <span className="text-xs text-muted-foreground font-semibold">
            {lang === "ar" ? "إدارات وهيكل تنظيمي" : "Operational Units"}
          </span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {t("positions")}
            </span>
            <Briefcase className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-2">{posList.length}</p>
          <span className="text-xs text-muted-foreground font-semibold">
            {lang === "ar" ? "مسميات ودرجات وظيفية" : "Job Titles & Levels"}
          </span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {t("roles")}
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black mt-2">{rolesList.length}</p>
          <span className="text-xs text-muted-foreground font-semibold">
            {systemActions.length} {t("allowedActions")}
          </span>
        </div>
      </div>

      {/* Sub navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/70 text-foreground hover:bg-muted"
            }`}
          >
            <Users className="w-4 h-4" />
            {t("users")} ({usersList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "departments"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/70 text-foreground hover:bg-muted"
            }`}
          >
            <Building2 className="w-4 h-4" />
            {t("departments")} ({deptList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("positions")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "positions"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/70 text-foreground hover:bg-muted"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            {t("positions")} ({posList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "roles"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/70 text-foreground hover:bg-muted"
            }`}
          >
            <Shield className="w-4 h-4" />
            {t("roles")} ({rolesList.length})
          </button>
        </div>

        {/* Action Buttons depending on tab */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refreshAll();
              toast.success(lang === "ar" ? "تم تحديث البيانات من قاعدة البيانات" : "Refreshed data from database");
            }}
            title={lang === "ar" ? "تحديث البيانات" : "Refresh data"}
            className="p-2 bg-card border border-border/70 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeTab === "users" && (
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t("addUser")}
            </button>
          )}
          {activeTab === "departments" && (
            <button
              type="button"
              onClick={() => setShowAddDeptModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("addDepartment")}
            </button>
          )}
          {activeTab === "positions" && (
            <button
              type="button"
              onClick={() => setShowAddPosModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("addPosition")}
            </button>
          )}
          {activeTab === "roles" && (
            <button
              type="button"
              onClick={() => setShowAddRoleModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("addRole")}
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: USERS LIST */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filter / Search toolbar */}
          <div className="flex flex-wrap items-center gap-3 bg-card rounded-xl p-3 border border-border/60 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "ar" ? "بحث بالاسم أو البريد..." : "Search by user name or email..."}
                className="w-full ps-9 pe-3 py-1.5 text-xs bg-secondary/50 rounded-lg border border-border/60 focus:bg-card focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {t("departments")}:
              </span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-secondary/50 rounded-lg border border-border/60 font-bold focus:outline-none"
              >
                <option value="all">{lang === "ar" ? "كل الإدارات" : "All Departments"}</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {pick(d.name.ar, d.name.en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="surface-panel rounded-xl overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground uppercase font-bold text-start">
                  <th className="p-3 text-start">{t("user")}</th>
                  <th className="p-3 text-start">{t("departments")}</th>
                  <th className="p-3 text-start">{t("positions")}</th>
                  <th className="p-3 text-start">{t("roles")}</th>
                  <th className="p-3 text-start">{t("allowedPages")}</th>
                  <th className="p-3 text-start">{t("allowedActions")}</th>
                  <th className="p-3 text-start">{lang === "ar" ? "الشريط" : "Sidebar"}</th>
                  <th className="p-3 text-start">{t("active")}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink">
                {filteredUsers.map((user) => {
                  const dept = deptList.find((d) => d.id === user.departmentId);
                  const pos = posList.find((p) => p.id === user.positionId);

                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Email */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center font-black text-primary text-xs">
                            {user.name.ar.charAt(0) || user.name.en.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {pick(user.name.ar, user.name.en)}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {dept ? pick(dept.name.ar, dept.name.en) : user.departmentId || "—"}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-md border border-border bg-muted text-[11px] font-bold">
                          {pos ? pick(pos.title.ar, pos.title.en) : user.positionId || "—"}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md border font-bold text-[10px] uppercase ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Allowed Pages Badge Count */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-background border border-border font-mono font-bold text-xs">
                            {user.allowedPages.length} / {systemPages.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {lang === "ar" ? "صفحة" : "pages"}
                          </span>
                        </div>
                      </td>

                      {/* Allowed Actions Count */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent-foreground border border-border font-mono font-bold text-xs">
                            {user.allowedActions.length} / {systemActions.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {lang === "ar" ? "إجراء" : "actions"}
                          </span>
                        </div>
                      </td>

                      {/* Sidebar Visibility */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            user.sidebarVisible
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-muted text-muted-foreground border-border/60"
                          }`}
                          title={
                            user.sidebarVisible
                              ? lang === "ar"
                                ? "الشريط الجانبي مرئي"
                                : "Sidebar visible"
                              : lang === "ar"
                              ? "الشريط الجانبي مخفي"
                              : "Sidebar hidden"
                          }
                        >
                          {user.sidebarVisible ? (
                            <PanelLeft className="w-3 h-3" />
                          ) : (
                            <PanelLeftClose className="w-3 h-3" />
                          )}
                          {user.sidebarVisible
                            ? lang === "ar"
                              ? "مرئي"
                              : "Visible"
                            : lang === "ar"
                            ? "مخفي"
                            : "Hidden"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            user.status === "active"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "active" ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                          {user.status === "active"
                            ? t("active")
                            : lang === "ar"
                            ? "معطل"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForDetail(user)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
                          >
                            {lang === "ar" ? "الصلاحيات" : "Perms"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            title={lang === "ar" ? "تعديل" : "Edit"}
                            className="p-1.5 rounded-md border border-border bg-card text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newStatus = user.status === "active" ? "inactive" : "active";
                              updateUser(user.id, { status: newStatus });
                              toast.info(
                                lang === "ar"
                                  ? `تم ${newStatus === "active" ? "تفعيل" : "تعطيل"} حساب المستخدم`
                                  : `User account ${newStatus}`
                              );
                            }}
                            title={lang === "ar" ? "تغيير الحالة" : "Toggle status"}
                            className="p-1.5 rounded-md border border-border bg-card hover:bg-muted"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "user",
                                id: user.id,
                                label: pick(user.name.ar, user.name.en),
                              })
                            }
                            title={lang === "ar" ? "حذف" : "Delete"}
                            className="p-1.5 rounded-md border border-border bg-card text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DEPARTMENTS */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptList.map((dept) => {
            const deptPositions = posList.filter((p) => p.departmentId === dept.id);
            const deptUsers = usersList.filter((u) => u.departmentId === dept.id);
            const managerUser = deptUsers.find((u) => u.status === "active");
            const managerName = managerUser
              ? pick(managerUser.name.ar, managerUser.name.en)
              : pick(dept.manager?.ar || "—", dept.manager?.en || "—");

            return (
              <div
                key={dept.id}
                className="surface-panel rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-muted rounded">
                        {dept.code}
                      </span>
                      <h3 className="font-bold text-base mt-2">
                        {pick(dept.name.ar, dept.name.en)}
                      </h3>
                    </div>
                    <Building2 className="w-6 h-6 text-primary shrink-0" />
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">
                        {lang === "ar" ? "المدير المسؤول:" : "Department Head:"}
                      </span>
                      <span className="font-bold">{managerName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">
                        {lang === "ar" ? "فريق العمل والموظفين:" : "Headcount / Staff:"}
                      </span>
                      <span className="font-mono font-bold px-2 py-0.5 bg-muted rounded">
                        {deptUsers.length} {lang === "ar" ? "أعضاء" : "members"}
                      </span>
                    </div>
                  </div>

                  {/* Positions under this department */}
                  <div className="mt-2 pt-2 border-t border-border/40">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
                      {lang === "ar" ? "المسميات الوظيفية التابعة:" : "Designated Job Titles:"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {deptPositions.map((pos) => (
                        <span
                          key={pos.id}
                          className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[11px] font-medium"
                        >
                          {pick(pos.title.ar, pos.title.en)}
                        </span>
                      ))}
                      {deptPositions.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">
                          {lang === "ar" ? "لا توجد وظائف مخصصة" : "No positions assigned"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "dept",
                        id: dept.id,
                        label: pick(dept.name.ar, dept.name.en),
                      })
                    }
                    className="inline-flex items-center gap-1 font-bold text-destructive hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {lang === "ar" ? "حذف" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDept(dept)}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeptFilter(dept.id);
                      setActiveTab("users");
                    }}
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    {lang === "ar" ? "عرض الموظفين" : "Filter Users"}
                    {lang === "ar" ? (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: POSITIONS */}
      {activeTab === "positions" && (
        <div className="surface-panel rounded-xl overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground uppercase font-bold">
                <th className="p-3 text-start">{lang === "ar" ? "الكود" : "Code"}</th>
                <th className="p-3 text-start">{t("positions")}</th>
                <th className="p-3 text-start">{t("departments")}</th>
                <th className="p-3 text-start">{t("level")}</th>
                <th className="p-3 text-start">{lang === "ar" ? "الموظفون المعينون" : "Assigned Staff"}</th>
                <th className="p-3 text-center">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {posList.map((pos) => {
                const dept = deptList.find((d) => d.id === pos.departmentId);
                const assignedUsers = usersList.filter((u) => u.positionId === pos.id);

                return (
                  <tr key={pos.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-primary">
                      {pos.code || pos.id.slice(0, 10) + "…"}
                    </td>
                    <td className="p-3 font-bold text-foreground text-sm">
                      {pick(pos.title.ar, pos.title.en)}
                    </td>
                    <td className="p-3 font-bold">
                      {dept ? pick(dept.name.ar, dept.name.en) : pos.departmentId || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          pos.level === "c-level"
                            ? "bg-primary text-primary-foreground"
                            : pos.level === "manager"
                            ? "bg-accent/20 text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pos.level}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-bold">
                        {assignedUsers.length} {lang === "ar" ? "موظف" : "employees"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPos(pos)}
                          title={lang === "ar" ? "تعديل" : "Edit"}
                          className="p-1.5 rounded-md border border-border bg-card text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "pos",
                              id: pos.id,
                              label: pick(pos.title.ar, pos.title.en),
                            })
                          }
                          title={lang === "ar" ? "حذف" : "Delete"}
                          className="p-1.5 rounded-md border border-border bg-card text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 4: ROLES */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {/* Roles Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder={lang === "ar" ? "بحث في مسميات الأدوار، الكود، أو الوصف..." : "Search roles, keys, or descriptions..."}
                className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setRoleTypeFilter("all")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  roleTypeFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "الكل" : "All"} ({rolesList.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleTypeFilter("system")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  roleTypeFilter === "system"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "أدوار النظام" : "System Roles"} ({rolesList.filter((r) => r.isSystem).length})
              </button>
              <button
                type="button"
                onClick={() => setRoleTypeFilter("custom")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  roleTypeFilter === "custom"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "أدوار مخصصة" : "Custom Roles"} ({rolesList.filter((r) => !r.isSystem).length})
              </button>
            </div>
          </div>

          {/* Roles Table */}
          <div className="surface-panel rounded-xl overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground uppercase font-bold">
                  <th className="p-3 text-start">{lang === "ar" ? "الدور والمعرّف" : "Role & Identifier"}</th>
                  <th className="p-3 text-start">{lang === "ar" ? "الوصف ونطاق الصلاحيات" : "Scope & Description"}</th>
                  <th className="p-3 text-start">{lang === "ar" ? "المستخدمون المعينون" : "Assigned Users"}</th>
                  <th className="p-3 text-start">{t("allowedPages")}</th>
                  <th className="p-3 text-start">{t("allowedActions")}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRoles.map((role) => {
                  const assignedUsers = usersList.filter((u) => u.role === role.key);
                  return (
                    <tr key={role.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase border ${getRoleBadgeClass(
                                role.key
                              )}`}
                            >
                              {pick(role.name.ar, role.name.en)}
                            </span>
                            {role.isSystem ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                {lang === "ar" ? "نظامي" : "System"}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                                {lang === "ar" ? "مخصص" : "Custom"}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            key: <strong className="text-foreground font-mono">{role.key}</strong>
                          </span>
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-semibold text-foreground line-clamp-2 text-xs">
                          {pick(role.description.ar, role.description.en) || "—"}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted/80 border border-border/60">
                            {assignedUsers.length} {lang === "ar" ? "مستخدم" : "users"}
                          </span>
                          {assignedUsers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery(role.key);
                                setActiveTab("users");
                              }}
                              title={lang === "ar" ? "عرض المستخدمين بهذا الدور" : "View users with this role"}
                              className="text-primary hover:underline text-[10px] font-bold"
                            >
                              {lang === "ar" ? "عرض" : "View"}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/25">
                            {role.allowedPages.length} {lang === "ar" ? "صفحات" : "pages"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {role.allowedPages.slice(0, 3).join(", ")}
                            {role.allowedPages.length > 3 && ` +${role.allowedPages.length - 3}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          <span className="font-bold text-accent-foreground bg-accent/15 px-2 py-0.5 rounded text-[10px] border border-accent/30">
                            {role.allowedActions.length} {lang === "ar" ? "إجراءات" : "actions"}
                          </span>
                          {role.allowedActions.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate font-mono">
                              {role.allowedActions.slice(0, 2).join(", ")}
                              {role.allowedActions.length > 2 && ` +${role.allowedActions.length - 2}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingRole(role)}
                            title={lang === "ar" ? "تعديل الدور والصلاحيات" : "Edit Role & Permissions"}
                            className="p-1.5 rounded-md border border-border bg-card text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={role.key === "admin"}
                            onClick={() =>
                              setDeleteTarget({
                                kind: "role",
                                id: role.id,
                                label: pick(role.name.ar, role.name.en),
                              })
                            }
                            title={
                              role.key === "admin"
                                ? lang === "ar"
                                  ? "لا يمكن حذف دور مدير النظام"
                                  : "Cannot delete Admin role"
                                : lang === "ar"
                                ? "حذف الدور"
                                : "Delete Role"
                            }
                            className={`p-1.5 rounded-md border border-border bg-card transition-colors ${
                              role.key === "admin"
                                ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                : "text-destructive hover:bg-destructive/10"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD USER ================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <h2 className="font-bold text-base">{t("addUser")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="hover:opacity-80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "الاسم الكامل (عربي) *" : "Full Name (Arabic) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.nameAr}
                    onChange={(e) => setNewUser({ ...newUser, nameAr: e.target.value })}
                    placeholder="مثال: كريم عبد العزيز"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "الاسم (إنجليزي)" : "Full Name (English)"}
                  </label>
                  <input
                    type="text"
                    value={newUser.nameEn}
                    onChange={(e) => setNewUser({ ...newUser, nameEn: e.target.value })}
                    placeholder="e.g. Karim Abdelaziz"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "البريد الإلكتروني *" : "Email Address *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="k.aziz@wazeer-elhelw.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("roles")}
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserItem["role"] })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    {(rolesList && rolesList.length > 0
                      ? rolesList.map((r) => ({ value: r.key, label: pick(r.name.ar, r.name.en) }))
                      : AVAILABLE_ROLES.map((r) => ({ value: r.value, label: lang === "ar" ? r.ar : r.en }))
                    ).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("departments")}
                  </label>
                  <select
                    value={newUser.departmentId}
                    onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    {deptList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {pick(d.name.ar, d.name.en)} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("positions")}
                  </label>
                  <select
                    value={newUser.positionId}
                    onChange={(e) => setNewUser({ ...newUser, positionId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    {posList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {pick(p.title.ar, p.title.en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sidebar Visibility */}
              <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                        newUser.sidebarVisible
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {newUser.sidebarVisible ? (
                        <PanelLeft className="w-4 h-4" />
                      ) : (
                        <PanelLeftClose className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs uppercase">
                        {lang === "ar" ? "إظهار الشريط الجانبي" : "Sidebar Visibility"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {newUser.sidebarVisible
                          ? lang === "ar"
                            ? "القائمة الجانبية تظهر عند تسجيل الدخول"
                            : "Sidebar is shown on login"
                          : lang === "ar"
                            ? "القائمة الجانبية مخفية عند تسجيل الدخول"
                            : "Sidebar is hidden on login"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() =>
                      setNewUser((prev) => ({
                        ...prev,
                        sidebarVisible: !prev.sidebarVisible,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                      newUser.sidebarVisible ? "bg-primary border-primary" : "bg-muted border-border"
                    }`}
                    aria-pressed={newUser.sidebarVisible}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        newUser.sidebarVisible ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Allowed Pages Section */}
              <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase">{t("allowedPages")}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const all = systemPages.map((p) => p.path);
                      setNewUser((prev) => ({
                        ...prev,
                        allowedPages: prev.allowedPages.length === all.length ? [] : all,
                      }));
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {newUser.allowedPages.length === systemPages.length
                      ? lang === "ar"
                        ? "إلغاء تحديد الكل"
                        : "Deselect All"
                      : lang === "ar"
                      ? "تحديد جميع الصفحات"
                      : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {systemPages.map((page) => {
                    const isAllowed = newUser.allowedPages.includes(page.path);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => togglePage(page.path)}
                        className={`flex items-center justify-between p-2.5 text-start rounded-lg border text-xs transition-colors ${
                          isAllowed
                            ? "bg-primary/10 font-bold border-primary/40 text-primary"
                            : "bg-card border-border/60 hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isAllowed
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border/80 bg-background"
                            }`}
                          >
                            {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{pick(page.name.ar, page.name.en)}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{page.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allowed Actions Section */}
              <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-accent" />
                    <h3 className="font-bold text-xs uppercase">{t("allowedActions")}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const all = systemActions.map((a) => a.id);
                      setNewUser((prev) => ({
                        ...prev,
                        allowedActions: prev.allowedActions.length === all.length ? [] : all,
                      }));
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {newUser.allowedActions.length === systemActions.length
                      ? lang === "ar"
                        ? "إلغاء تحديد الكل"
                        : "Deselect All"
                      : lang === "ar"
                      ? "تحديد جميع الصلاحيات"
                      : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {systemActions.map((act) => {
                    const isAllowed = newUser.allowedActions.includes(act.id);
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => toggleAction(act.id)}
                        className={`flex items-center justify-between p-2.5 text-start rounded-lg border text-xs transition-colors ${
                          isAllowed ? "bg-accent/15 font-bold border-accent/40" : "bg-card border-border/60 hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isAllowed
                                ? "bg-accent text-accent-foreground border-accent"
                                : "border-border/80 bg-background"
                            }`}
                          >
                            {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{pick(act.name.ar, act.name.en)}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{act.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
                >
                  {t("addUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD DEPARTMENT ================= */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <h2 className="font-bold text-base">{t("addDepartment")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                className="hover:opacity-80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "اسم القسم أو الإدارة (عربي) *" : "Department Name (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newDept.nameAr}
                  onChange={(e) => setNewDept({ ...newDept, nameAr: e.target.value })}
                  placeholder="مثال: إدارة التسويق والعلاقات العامة"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "اسم القسم (إنجليزي)" : "Department Name (English)"}
                </label>
                <input
                  type="text"
                  value={newDept.nameEn}
                  onChange={(e) => setNewDept({ ...newDept, nameEn: e.target.value })}
                  placeholder="e.g. Marketing & Public Relations"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "رمز القسم (كود) *" : "Code *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDept.code}
                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                    placeholder="MKT"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono font-bold uppercase focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "المدير المسؤول" : "Department Manager"}
                  </label>
                  <select
                    value={newDept.managerId}
                    onChange={(e) => setNewDept({ ...newDept, managerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="">{lang === "ar" ? "غير محدد" : "Unassigned"}</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {pick(u.name.ar, u.name.en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
                >
                  {t("addDepartment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD POSITION ================= */}
      {showAddPosModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                <h2 className="font-bold text-base">{t("addPosition")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPosModal(false)}
                className="hover:opacity-80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePos} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "المسمى الوظيفي (عربي) *" : "Job Title (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newPos.titleAr}
                  onChange={(e) => setNewPos({ ...newPos, titleAr: e.target.value })}
                  placeholder="مثال: مسؤول مبيعات كبار العملاء"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "المسمى الوظيفي (إنجليزي)" : "Job Title (English)"}
                </label>
                <input
                  type="text"
                  value={newPos.titleEn}
                  onChange={(e) => setNewPos({ ...newPos, titleEn: e.target.value })}
                  placeholder="e.g. Key Account Executive"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "رمز المسمى الوظيفي (كود)" : "Position Code"}
                </label>
                <input
                  type="text"
                  value={newPos.code}
                  onChange={(e) => setNewPos({ ...newPos, code: e.target.value })}
                  placeholder="مثال: pos-sales-exec"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("departments")}
                  </label>
                  <select
                    value={newPos.departmentId}
                    onChange={(e) => setNewPos({ ...newPos, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    {deptList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {pick(d.name.ar, d.name.en)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("level")}
                  </label>
                  <select
                    value={newPos.level}
                    onChange={(e) => setNewPos({ ...newPos, level: e.target.value as PositionItem["level"] })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="c-level">C-Level (إدارة عليا)</option>
                    <option value="manager">Manager (مدير إدارة)</option>
                    <option value="specialist">Specialist (أخصائي)</option>
                    <option value="staff">Staff (فريق تنفيذ / كاشير)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddPosModal(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
                >
                  {t("addPosition")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER ================= */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          deptList={deptList}
          posList={posList}
          rolesList={rolesList}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUserSubmit}
        />
      )}

      {/* ================= MODAL: EDIT DEPARTMENT ================= */}
      {editingDept && (
        <EditDeptModal
          dept={editingDept}
          usersList={usersList}
          onClose={() => setEditingDept(null)}
          onSave={handleEditDeptSubmit}
        />
      )}

      {/* ================= MODAL: EDIT POSITION ================= */}
      {editingPos && (
        <EditPosModal
          pos={editingPos}
          deptList={deptList}
          onClose={() => setEditingPos(null)}
          onSave={handleEditPosSubmit}
        />
      )}

      {/* ================= MODAL: ADD ROLE ================= */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <h2 className="font-bold text-base">{t("addRole")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "رمز الدور الإنجليزي (كود / Key) *" : "Role Key (slug) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newRole.key}
                    onChange={(e) => setNewRole({ ...newRole, key: e.target.value })}
                    placeholder="e.g. supervisor, team_leader"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono focus:border-primary focus:outline-none transition-colors"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {lang === "ar" ? "يستخدم كرمز تعريف بالنظام (حروف وأرقام و _)" : "Used as an identifier in system"}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "اسم الدور (عربي) *" : "Role Name (Arabic) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newRole.nameAr}
                    onChange={(e) => setNewRole({ ...newRole, nameAr: e.target.value })}
                    placeholder="مثال: مشرف تشغيل وورديات"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {lang === "ar" ? "اسم الدور (إنجليزي)" : "Role Name (English)"}
                </label>
                <input
                  type="text"
                  value={newRole.nameEn}
                  onChange={(e) => setNewRole({ ...newRole, nameEn: e.target.value })}
                  placeholder="e.g. Operations Shift Supervisor"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "الوصف والمهام (عربي)" : "Description (Arabic)"}
                  </label>
                  <textarea
                    rows={2}
                    value={newRole.descriptionAr}
                    onChange={(e) => setNewRole({ ...newRole, descriptionAr: e.target.value })}
                    placeholder="موجز عن مسؤوليات هذا الدور..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "الوصف والمهام (إنجليزي)" : "Description (English)"}
                  </label>
                  <textarea
                    rows={2}
                    value={newRole.descriptionEn}
                    onChange={(e) => setNewRole({ ...newRole, descriptionEn: e.target.value })}
                    placeholder="Summary of role responsibilities..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Allowed Pages Matrix */}
              <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    {t("allowedPages")} ({newRole.allowedPages.length}/{systemPages.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (newRole.allowedPages.length === systemPages.length) {
                        setNewRole({ ...newRole, allowedPages: [] });
                      } else {
                        setNewRole({ ...newRole, allowedPages: systemPages.map((p) => p.path) });
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {newRole.allowedPages.length === systemPages.length
                      ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                      : lang === "ar" ? "تحديد الكل" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {systemPages.map((page) => {
                    const checked = newRole.allowedPages.includes(page.path);
                    return (
                      <button
                        type="button"
                        key={page.id}
                        onClick={() => {
                          setNewRole({
                            ...newRole,
                            allowedPages: checked
                              ? newRole.allowedPages.filter((p) => p !== page.path)
                              : [...newRole.allowedPages, page.path],
                          });
                        }}
                        className={`p-2 rounded-lg border text-start text-xs flex items-center justify-between transition-all ${
                          checked
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{pick(page.name.ar, page.name.en)}</span>
                        {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allowed Actions Matrix */}
              <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-accent" />
                    {t("allowedActions")} ({newRole.allowedActions.length}/{systemActions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (newRole.allowedActions.length === systemActions.length) {
                        setNewRole({ ...newRole, allowedActions: [] });
                      } else {
                        setNewRole({ ...newRole, allowedActions: systemActions.map((a) => a.id) });
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {newRole.allowedActions.length === systemActions.length
                      ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                      : lang === "ar" ? "تحديد الكل" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {systemActions.map((act) => {
                    const checked = newRole.allowedActions.includes(act.id);
                    return (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => {
                          setNewRole({
                            ...newRole,
                            allowedActions: checked
                              ? newRole.allowedActions.filter((a) => a !== act.id)
                              : [...newRole.allowedActions, act.id],
                          });
                        }}
                        className={`p-2 rounded-lg border text-start text-xs flex items-center justify-between transition-all ${
                          checked
                            ? "bg-accent/15 border-accent text-accent-foreground font-bold shadow-xs"
                            : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex flex-col truncate">
                          <span className="truncate">{pick(act.name.ar, act.name.en)}</span>
                          <span className="font-mono text-[9px] text-muted-foreground">{act.id}</span>
                        </div>
                        {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
                >
                  {t("addRole")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ROLE ================= */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={handleEditRoleSubmit}
        />
      )}

      {/* ================= DETAIL DRAWER / MODAL ================= */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <h2 className="font-bold text-base">
                    {pick(selectedUserForDetail.name.ar, selectedUserForDetail.name.en)}
                  </h2>
                  <p className="text-xs opacity-90 font-mono">{selectedUserForDetail.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForDetail(null)}
                className="hover:opacity-80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile summary */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/50 rounded-xl border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">{t("departments")}</span>
                  <span className="font-bold">
                    {pick(
                      deptList.find((d) => d.id === selectedUserForDetail.departmentId)?.name.ar || "—",
                      deptList.find((d) => d.id === selectedUserForDetail.departmentId)?.name.en || "—"
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">{t("positions")}</span>
                  <span className="font-bold">
                    {pick(
                      posList.find((p) => p.id === selectedUserForDetail.positionId)?.title.ar || "—",
                      posList.find((p) => p.id === selectedUserForDetail.positionId)?.title.en || "—"
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">{lang === "ar" ? "آخر نشاط" : "Last Active"}</span>
                  <span className="font-bold">{selectedUserForDetail.lastActive}</span>
                </div>
              </div>

              {/* Sidebar Visibility Toggle */}
              <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                        selectedUserForDetail.sidebarVisible
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {selectedUserForDetail.sidebarVisible ? (
                        <PanelLeft className="w-4 h-4" />
                      ) : (
                        <PanelLeftClose className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase">
                        {lang === "ar" ? "إظهار الشريط الجانبي" : "Sidebar Visibility"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedUserForDetail.sidebarVisible
                          ? lang === "ar" ? "القائمة الجانبية ظاهرة للمستخدم" : "Sidebar is shown for this user"
                          : lang === "ar" ? "القائمة الجانبية مخفية للمستخدم" : "Sidebar is hidden for this user"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    dir="ltr"
                    onClick={toggleSelectedUserSidebar}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                      selectedUserForDetail.sidebarVisible
                        ? "bg-primary border-primary"
                        : "bg-muted border-border"
                    }`}
                    aria-pressed={selectedUserForDetail.sidebarVisible}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        selectedUserForDetail.sidebarVisible ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Permitted Pages */}
              <div>
                <h4 className="font-bold text-xs uppercase mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  {t("allowedPages")} ({selectedUserForDetail.allowedPages.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {systemPages.map((page) => {
                    const isGranted = selectedUserForDetail.allowedPages.includes(page.path);
                    return (
                      <div
                        key={page.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          isGranted ? "bg-emerald-500/10 font-bold border-emerald-500/30 text-emerald-800" : "opacity-40 line-through bg-muted border-border/50"
                        }`}
                      >
                        <span>{pick(page.name.ar, page.name.en)}</span>
                        {isGranted ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permitted Actions */}
              <div>
                <h4 className="font-bold text-xs uppercase mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-accent" />
                  {t("allowedActions")} ({selectedUserForDetail.allowedActions.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {systemActions.map((act) => {
                    const isGranted = selectedUserForDetail.allowedActions.includes(act.id);
                    return (
                      <div
                        key={act.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          isGranted ? "bg-accent/15 font-bold border-accent/40" : "opacity-40 line-through bg-muted border-border/50"
                        }`}
                      >
                        <span>{pick(act.name.ar, act.name.en)}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{act.id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedUserForDetail(null)}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs uppercase shadow-sm hover:opacity-95"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE DIALOG ================= */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={lang === "ar" ? "تأكيد الحذف" : "Confirm delete"}
        message={
          lang === "ar"
            ? `سيتم حذف «${deleteTarget?.label ?? ""}» نهائياً.`
            : `"${deleteTarget?.label ?? ""}" will be permanently deleted.`
        }
        onConfirm={() => {
          if (deleteTarget) {
            if (deleteTarget.kind === "user") {
              deleteUser(deleteTarget.id);
              toast.success(lang === "ar" ? "تم حذف المستخدم بنجاح" : "User deleted successfully");
            }
            if (deleteTarget.kind === "dept") {
              deleteDepartment(deleteTarget.id);
              toast.success(lang === "ar" ? "تم حذف القسم بنجاح" : "Department deleted successfully");
            }
            if (deleteTarget.kind === "pos") {
              deletePosition(deleteTarget.id);
              toast.success(lang === "ar" ? "تم حذف المسمى الوظيفي بنجاح" : "Position deleted successfully");
            }
            if (deleteTarget.kind === "role") {
              deleteRole(deleteTarget.id);
              toast.success(lang === "ar" ? "تم حذف الدور بنجاح" : "Role deleted successfully");
            }
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

// =====================================================================
// EDIT USER MODAL COMPONENT
// =====================================================================
function EditUserModal({
  user,
  deptList,
  posList,
  rolesList,
  onClose,
  onSave,
}: {
  user: UserItem;
  deptList: DepartmentItem[];
  posList: PositionItem[];
  rolesList?: RoleItem[];
  onClose: () => void;
  onSave: (updated: Partial<UserItem>) => void;
}) {
  const { lang, t, pick } = useI18n();
  const [formData, setFormData] = useState({
    nameAr: user.name.ar,
    nameEn: user.name.en,
    email: user.email,
    departmentId: user.departmentId,
    positionId: user.positionId,
    role: user.role,
    status: user.status,
    sidebarVisible: user.sidebarVisible ?? true,
    allowedPages: [...user.allowedPages],
    allowedActions: [...user.allowedActions],
  });

  const togglePage = (path: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(path)
        ? prev.allowedPages.filter((p) => p !== path)
        : [...prev.allowedPages, path],
    }));
  };

  const toggleAction = (actionId: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(actionId)
        ? prev.allowedActions.filter((a) => a !== actionId)
        : [...prev.allowedActions, actionId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.email) return;

    onSave({
      name: { ar: formData.nameAr, en: formData.nameEn || formData.nameAr },
      email: formData.email,
      departmentId: formData.departmentId,
      positionId: formData.positionId,
      role: formData.role,
      status: formData.status,
      sidebarVisible: formData.sidebarVisible,
      allowedPages: formData.allowedPages,
      allowedActions: formData.allowedActions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            <h2 className="font-bold text-base">
              {lang === "ar" ? "تعديل بيانات المستخدم" : "Edit User Profile"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-80 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "الاسم الكامل (عربي) *" : "Full Name (Arabic) *"}
              </label>
              <input
                type="text"
                required
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "الاسم (إنجليزي)" : "Full Name (English)"}
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "البريد الإلكتروني *" : "Email Address *"}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {t("roles")}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserItem["role"] })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                {(rolesList && rolesList.length > 0
                  ? rolesList.map((r) => ({ value: r.key, label: pick(r.name.ar, r.name.en) }))
                  : AVAILABLE_ROLES.map((r) => ({ value: r.value, label: lang === "ar" ? r.ar : r.en }))
                ).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {t("departments")}
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                <option value="">{lang === "ar" ? "غير محدد" : "None"}</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {pick(d.name.ar, d.name.en)} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {t("positions")}
              </label>
              <select
                value={formData.positionId}
                onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                <option value="">{lang === "ar" ? "غير محدد" : "None"}</option>
                {posList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pick(p.title.ar, p.title.en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 p-4 bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase">{t("active")}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {formData.status === "active"
                    ? lang === "ar" ? "الحساب مفعل ويمكنه الدخول" : "Account is active"
                    : lang === "ar" ? "الحساب معطل وممنوع من الدخول" : "Account is disabled"}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    status: prev.status === "active" ? "inactive" : "active",
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  formData.status === "active"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                }`}
              >
                {formData.status === "active" ? t("active") : lang === "ar" ? "معطل" : "Inactive"}
              </button>
            </div>

            <div className="rounded-xl border border-border/60 p-4 bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase">
                  {lang === "ar" ? "إظهار الشريط الجانبي" : "Sidebar Visibility"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {formData.sidebarVisible
                    ? lang === "ar" ? "الشريط الجانبي مرئي" : "Sidebar visible"
                    : lang === "ar" ? "الشريط الجانبي مخفي" : "Sidebar hidden"}
                </p>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={() => setFormData((prev) => ({ ...prev, sidebarVisible: !prev.sidebarVisible }))}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                  formData.sidebarVisible ? "bg-primary border-primary" : "bg-muted border-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    formData.sidebarVisible ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Allowed Pages */}
          <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-xs uppercase">{t("allowedPages")}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const all = systemPages.map((p) => p.path);
                  setFormData((prev) => ({
                    ...prev,
                    allowedPages: prev.allowedPages.length === all.length ? [] : all,
                  }));
                }}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {formData.allowedPages.length === systemPages.length
                  ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                  : lang === "ar" ? "تحديد جميع الصفحات" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {systemPages.map((page) => {
                const isAllowed = formData.allowedPages.includes(page.path);
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => togglePage(page.path)}
                    className={`flex items-center justify-between p-2.5 text-start rounded-lg border text-xs transition-colors ${
                      isAllowed
                        ? "bg-primary/10 font-bold border-primary/40 text-primary"
                        : "bg-card border-border/60 hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isAllowed
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/80 bg-background"
                        }`}
                      >
                        {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{pick(page.name.ar, page.name.en)}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{page.path}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed Actions */}
          <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-xs uppercase">{t("allowedActions")}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const all = systemActions.map((a) => a.id);
                  setFormData((prev) => ({
                    ...prev,
                    allowedActions: prev.allowedActions.length === all.length ? [] : all,
                  }));
                }}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {formData.allowedActions.length === systemActions.length
                  ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                  : lang === "ar" ? "تحديد جميع الصلاحيات" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {systemActions.map((act) => {
                const isAllowed = formData.allowedActions.includes(act.id);
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => toggleAction(act.id)}
                    className={`flex items-center justify-between p-2.5 text-start rounded-lg border text-xs transition-colors ${
                      isAllowed
                        ? "bg-accent/15 font-bold border-accent/40"
                        : "bg-card border-border/60 hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isAllowed
                            ? "bg-accent text-accent-foreground border-accent"
                            : "border-border/80 bg-background"
                        }`}
                      >
                        {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{pick(act.name.ar, act.name.en)}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{act.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
            >
              {lang === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// EDIT DEPARTMENT MODAL COMPONENT
// =====================================================================
function EditDeptModal({
  dept,
  usersList,
  onClose,
  onSave,
}: {
  dept: DepartmentItem;
  usersList: UserItem[];
  onClose: () => void;
  onSave: (updated: Partial<DepartmentItem> & { managerId?: string }) => void;
}) {
  const { lang, pick } = useI18n();
  const [nameAr, setNameAr] = useState(dept.name.ar);
  const [nameEn, setNameEn] = useState(dept.name.en);
  const [code, setCode] = useState(dept.code);
  const [managerId, setManagerId] = useState(
    usersList.find((u) => u.departmentId === dept.id)?.id || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !code) return;

    onSave({
      name: { ar: nameAr, en: nameEn || nameAr },
      code: code.toUpperCase(),
      managerId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h2 className="font-bold text-base">
              {lang === "ar" ? "تعديل بيانات القسم / الإدارة" : "Edit Department"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-80 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {lang === "ar" ? "اسم القسم أو الإدارة (عربي) *" : "Department Name (Arabic) *"}
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {lang === "ar" ? "اسم القسم (إنجليزي)" : "Department Name (English)"}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "رمز القسم (كود) *" : "Code *"}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono font-bold uppercase focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "المدير المسؤول" : "Department Manager"}
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                <option value="">{lang === "ar" ? "غير محدد" : "Unassigned"}</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {pick(u.name.ar, u.name.en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
            >
              {lang === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// EDIT POSITION MODAL COMPONENT
// =====================================================================
function EditPosModal({
  pos,
  deptList,
  onClose,
  onSave,
}: {
  pos: PositionItem;
  deptList: DepartmentItem[];
  onClose: () => void;
  onSave: (updated: Partial<PositionItem>) => void;
}) {
  const { lang, t, pick } = useI18n();
  const [titleAr, setTitleAr] = useState(pos.title.ar);
  const [titleEn, setTitleEn] = useState(pos.title.en);
  const [code, setCode] = useState(pos.code || "");
  const [departmentId, setDepartmentId] = useState(pos.departmentId);
  const [level, setLevel] = useState<PositionItem["level"]>(pos.level || "specialist");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr) return;

    onSave({
      title: { ar: titleAr, en: titleEn || titleAr },
      code: code ? code.toLowerCase() : undefined,
      departmentId,
      level,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            <h2 className="font-bold text-base">
              {lang === "ar" ? "تعديل المسمى الوظيفي" : "Edit Position"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-80 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {lang === "ar" ? "المسمى الوظيفي (عربي) *" : "Job Title (Arabic) *"}
            </label>
            <input
              type="text"
              required
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {lang === "ar" ? "المسمى الوظيفي (إنجليزي)" : "Job Title (English)"}
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {lang === "ar" ? "رمز المسمى (كود)" : "Position Code"}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. pos-gm, pos-cashier"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {t("departments")}
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                <option value="">{lang === "ar" ? "غير محدد" : "Unassigned"}</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {pick(d.name.ar, d.name.en)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {t("level")}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as PositionItem["level"])}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
              >
                <option value="c-level">C-Level (إدارة عليا)</option>
                <option value="manager">Manager (مدير إدارة)</option>
                <option value="specialist">Specialist (أخصائي)</option>
                <option value="staff">Staff (فريق تنفيذ / كاشير)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
            >
              {lang === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// EDIT ROLE MODAL COMPONENT
// =====================================================================
function EditRoleModal({
  role,
  onClose,
  onSave,
}: {
  role: RoleItem;
  onClose: () => void;
  onSave: (updatedData: Partial<RoleItem>) => void;
}) {
  const { lang, t, pick } = useI18n();
  const [nameAr, setNameAr] = useState(role.name.ar);
  const [nameEn, setNameEn] = useState(role.name.en);
  const [descriptionAr, setDescriptionAr] = useState(role.description.ar);
  const [descriptionEn, setDescriptionEn] = useState(role.description.en);
  const [allowedPages, setAllowedPages] = useState<string[]>(role.allowedPages || []);
  const [allowedActions, setAllowedActions] = useState<string[]>(role.allowedActions || []);

  const togglePage = (path: string) => {
    setAllowedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const toggleAction = (actId: string) => {
    setAllowedActions((prev) =>
      prev.includes(actId) ? prev.filter((a) => a !== actId) : [...prev, actId]
    );
  };

  const toggleAllPages = () => {
    if (allowedPages.length === systemPages.length) {
      setAllowedPages([]);
    } else {
      setAllowedPages(systemPages.map((p) => p.path));
    }
  };

  const toggleAllActions = () => {
    if (allowedActions.length === systemActions.length) {
      setAllowedActions([]);
    } else {
      setAllowedActions(systemActions.map((a) => a.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr) return;
    onSave({
      name: { ar: nameAr, en: nameEn || nameAr },
      description: { ar: descriptionAr, en: descriptionEn || descriptionAr },
      allowedPages,
      allowedActions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            <h3 className="font-bold text-sm">
              {lang === "ar" ? "تعديل الدور والصلاحيات" : "Edit Role & Permissions"}
            </h3>
            <span className="font-mono text-xs opacity-90 px-2 py-0.5 rounded bg-black/20">
              {role.key}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-80 p-1 text-primary-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "اسم الدور (عربي) *" : "Role Name (Arabic) *"}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "اسم الدور (إنجليزي)" : "Role Name (English)"}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "الوصف والمهام (عربي)" : "Description (Arabic)"}
              </label>
              <textarea
                rows={2}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                {lang === "ar" ? "الوصف والمهام (إنجليزي)" : "Description (English)"}
              </label>
              <textarea
                rows={2}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Permitted Pages Section */}
          <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                {t("allowedPages")} ({allowedPages.length}/{systemPages.length})
              </span>
              <button
                type="button"
                onClick={toggleAllPages}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {allowedPages.length === systemPages.length
                  ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                  : lang === "ar" ? "تحديد الكل" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {systemPages.map((page) => {
                const checked = allowedPages.includes(page.path);
                return (
                  <button
                    type="button"
                    key={page.id}
                    onClick={() => togglePage(page.path)}
                    className={`p-2 rounded-lg border text-start text-xs flex items-center justify-between transition-all ${
                      checked
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{pick(page.name.ar, page.name.en)}</span>
                    {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permitted Actions Section */}
          <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-accent" />
                {t("allowedActions")} ({allowedActions.length}/{systemActions.length})
              </span>
              <button
                type="button"
                onClick={toggleAllActions}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {allowedActions.length === systemActions.length
                  ? lang === "ar" ? "إلغاء تحديد الكل" : "Deselect All"
                  : lang === "ar" ? "تحديد الكل" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {systemActions.map((act) => {
                const checked = allowedActions.includes(act.id);
                return (
                  <button
                    type="button"
                    key={act.id}
                    onClick={() => toggleAction(act.id)}
                    className={`p-2 rounded-lg border text-start text-xs flex items-center justify-between transition-all ${
                      checked
                        ? "bg-accent/15 border-accent text-accent-foreground font-bold shadow-xs"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{pick(act.name.ar, act.name.en)}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">{act.id}</span>
                    </div>
                    {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
            >
              {lang === "ar" ? "حفظ التعديلات" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
