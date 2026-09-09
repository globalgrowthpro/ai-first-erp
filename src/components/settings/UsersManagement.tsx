import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { CURRENT_USER_ID, setSidebarVisible } from "@/lib/ui-prefs";
import {
  departments as initialDepartments,
  positions as initialPositions,
  systemPages,
  systemActions,
  users as initialUsers,
  type UserItem,
  type DepartmentItem,
  type PositionItem,
} from "@/lib/demo-data";
import {
  Users,
  UserPlus,
  Building2,
  Briefcase,
  ShieldCheck,
  Search,
  Plus,
  Check,
  X,
  Layers,
  KeyRound,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";

export function UsersManagement() {
  const { lang, t, pick } = useI18n();

  // State
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
  const [deptList, setDeptList] = useState<DepartmentItem[]>(initialDepartments);
  const [posList, setPosList] = useState<PositionItem[]>(initialPositions);

  const [activeTab, setActiveTab] = useState<"users" | "departments" | "positions">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserItem | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    nameAr: "",
    nameEn: "",
    email: "",
    departmentId: "dept-retail",
    positionId: "pos-branch-mgr",
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
  });

  // New Position Form State
  const [newPos, setNewPos] = useState({
    titleAr: "",
    titleEn: "",
    departmentId: "dept-retail",
    level: "specialist" as PositionItem["level"],
  });

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
      id: `usr-${Date.now()}`,
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

    setUsersList((prev) => [user, ...prev]);
    // update dept headcount
    setDeptList((prev) =>
      prev.map((d) => (d.id === newUser.departmentId ? { ...d, headcount: d.headcount + 1 } : d))
    );
    setShowAddUserModal(false);
    setNewUser({
      nameAr: "",
      nameEn: "",
      email: "",
      departmentId: "dept-retail",
      positionId: "pos-branch-mgr",
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

    const dept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: { ar: newDept.nameAr, en: newDept.nameEn || newDept.nameAr },
      code: newDept.code.toUpperCase(),
      manager: { ar: newDept.managerAr || "غير محدد", en: newDept.managerEn || "TBD" },
      headcount: 0,
    };

    setDeptList((prev) => [...prev, dept]);
    setShowAddDeptModal(false);
    setNewDept({ nameAr: "", nameEn: "", code: "", managerAr: "", managerEn: "" });
  };

  // Handle Add Position
  const handleCreatePos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPos.titleAr) return;

    const pos: PositionItem = {
      id: `pos-${Date.now()}`,
      title: { ar: newPos.titleAr, en: newPos.titleEn || newPos.titleAr },
      departmentId: newPos.departmentId,
      level: newPos.level,
    };

    setPosList((prev) => [...prev, pos]);
    setShowAddPosModal(false);
    setNewPos({ titleAr: "", titleEn: "", departmentId: "dept-retail", level: "specialist" });
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
    setUsersList((prev) =>
      prev.map((u) => (u.id === selectedUserForDetail.id ? { ...u, sidebarVisible: next } : u))
    );
    setSelectedUserForDetail((prev) => (prev ? { ...prev, sidebarVisible: next } : prev));
    // The signed-in demo user drives the real sidebar in the app shell
    if (selectedUserForDetail.id === CURRENT_USER_ID) setSidebarVisible(next);
  };

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
              {t("allowedActions")}
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black mt-2">{systemActions.length}</p>
          <span className="text-xs text-muted-foreground font-semibold">
            {systemPages.length} {lang === "ar" ? "صفحات نظام" : "ERP Pages"}
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
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
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
                  <th className="p-3 text-center">{lang === "ar" ? "التفاصيل" : "Details"}</th>
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
                            {user.name.ar.charAt(0)}
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
                          {dept ? pick(dept.name.ar, dept.name.en) : user.departmentId}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-md border border-border bg-muted text-[11px] font-bold">
                          {pos ? pick(pos.title.ar, pos.title.en) : user.positionId}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border border-border font-bold text-[10px] uppercase ${
                            user.role === "admin"
                              ? "bg-primary text-primary-foreground border-primary"
                              : user.role === "accountant"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : user.role === "sales"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-muted"
                          }`}
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
                            {lang === "ar" ? "صفحة مصرح بها" : "pages"}
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
                            {lang === "ar" ? "إجراء مصرح" : "actions"}
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
                          title={user.sidebarVisible ? (lang === "ar" ? "الشريط الجانبي مرئي" : "Sidebar visible") : (lang === "ar" ? "الشريط الجانبي مخفي" : "Sidebar hidden")}
                        >
                          {user.sidebarVisible ? <PanelLeft className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
                          {user.sidebarVisible
                            ? lang === "ar" ? "مرئي" : "Visible"
                            : lang === "ar" ? "مخفي" : "Hidden"}
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
                          {user.status === "active" ? t("active") : lang === "ar" ? "معطل" : "Inactive"}
                        </span>
                      </td>

                      {/* Details View Button */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDetail(user)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
                        >
                          {lang === "ar" ? "عرض الصلاحيات" : "View Perms"}
                        </button>
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
                      <span className="font-bold">{pick(dept.manager.ar, dept.manager.en)}</span>
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
                  <span className="text-muted-foreground">ID: {dept.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeptFilter(dept.id);
                      setActiveTab("users");
                    }}
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    {lang === "ar" ? "عرض الموظفين" : "Filter Users"}
                    {lang === "ar" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                <th className="p-3 text-start">ID</th>
                <th className="p-3 text-start">{t("positions")}</th>
                <th className="p-3 text-start">{t("departments")}</th>
                <th className="p-3 text-start">{t("level")}</th>
                <th className="p-3 text-start">{lang === "ar" ? "الموظفون المعينون" : "Assigned Staff"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {posList.map((pos) => {
                const dept = deptList.find((d) => d.id === pos.departmentId);
                const assignedUsers = usersList.filter((u) => u.positionId === pos.id);

                return (
                  <tr key={pos.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-muted-foreground">{pos.id}</td>
                    <td className="p-3 font-bold text-foreground text-sm">
                      {pick(pos.title.ar, pos.title.en)}
                    </td>
                    <td className="p-3 font-bold">
                      {dept ? pick(dept.name.ar, dept.name.en) : pos.departmentId}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* MODAL: ADD USER */}
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
                    <option value="admin">Admin ({lang === "ar" ? "مدير نظام" : "Administrator"})</option>
                    <option value="manager">Manager ({lang === "ar" ? "مدير إدارة" : "Manager"})</option>
                    <option value="accountant">Accountant ({lang === "ar" ? "محاسب مالي" : "Accountant"})</option>
                    <option value="sales">Sales ({lang === "ar" ? "مبيعات وكاشير" : "Sales"})</option>
                    <option value="warehouse">Warehouse ({lang === "ar" ? "مخازن وتوريد" : "Warehouse"})</option>
                    <option value="auditor">Auditor ({lang === "ar" ? "مراجع جودة" : "Auditor"})</option>
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
                      {newUser.sidebarVisible ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs uppercase">
                        {lang === "ar" ? "إظهار الشريط الجانبي" : "Sidebar Visibility"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {newUser.sidebarVisible
                          ? lang === "ar" ? "القائمة الجانبية تظهر عند تسجيل الدخول" : "Sidebar is shown on login"
                          : lang === "ar" ? "القائمة الجانبية مخفية عند تسجيل الدخول" : "Sidebar is hidden on login"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() => setNewUser((prev) => ({ ...prev, sidebarVisible: !prev.sidebarVisible }))}
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
                          isAllowed ? "bg-primary/10 font-bold border-primary/40 text-primary" : "bg-card border-border/60 hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isAllowed ? "bg-primary text-primary-foreground border-primary" : "border-border/80 bg-background"
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
                              isAllowed ? "bg-accent text-accent-foreground border-accent" : "border-border/80 bg-background"
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

      {/* MODAL: ADD DEPARTMENT */}
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
                  <input
                    type="text"
                    value={newDept.managerAr}
                    onChange={(e) => setNewDept({ ...newDept, managerAr: e.target.value })}
                    placeholder="مثال: ياسمين عز الدين"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none"
                  />
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

      {/* MODAL: ADD POSITION */}
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

      {/* DETAIL DRAWER / MODAL: VIEW SPECIFIC USER PERMISSIONS */}
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
                      deptList.find((d) => d.id === selectedUserForDetail.departmentId)?.name.ar || "",
                      deptList.find((d) => d.id === selectedUserForDetail.departmentId)?.name.en || ""
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">{t("positions")}</span>
                  <span className="font-bold">
                    {pick(
                      posList.find((p) => p.id === selectedUserForDetail.positionId)?.title.ar || "",
                      posList.find((p) => p.id === selectedUserForDetail.positionId)?.title.en || ""
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
    </div>
  );
}

