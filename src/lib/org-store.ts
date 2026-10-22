import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type UserItem,
  type DepartmentItem,
  type PositionItem,
  type RoleItem,
  defaultRoles,
  users as defaultUsers,
  departments as defaultDepartments,
  positions as defaultPositions,
} from "@/lib/demo-data";

export type { UserItem, DepartmentItem, PositionItem, RoleItem };

// Mapping between UI role keys and PostgreSQL app_role enum values
export const DB_ROLE_MAP: Record<
  string,
  "admin" | "cfo" | "kitchen" | "sales" | "warehouse" | "ai"
> = {
  admin: "admin",
  cto: "admin",
  hr: "admin",
  manager: "kitchen",
  branch_manager: "sales",
  accountant: "cfo",
  cfo: "cfo",
  purchase: "warehouse",
  helpdesk: "sales",
  kitchen: "kitchen",
  chef: "kitchen",
  sales: "sales",
  warehouse: "warehouse",
  driver: "warehouse",
  auditor: "cfo",
  employee: "sales",
  assistant: "sales",
  ai: "ai",
  pos_cashier: "sales",
};

export function toDbRole(
  role: string
): "admin" | "cfo" | "kitchen" | "sales" | "warehouse" | "ai" {
  return DB_ROLE_MAP[role.toLowerCase()] || "sales";
}

export function fromDbRole(dbRole: string): UserItem["role"] {
  switch (dbRole) {
    case "pos_cashier":
      return "pos_cashier";
    case "cfo":
      return "accountant";
    case "kitchen":
      return "manager";
    case "admin":
      return "admin";
    case "warehouse":
      return "warehouse";
    case "sales":
      return "sales";
    case "hr":
      return "hr";
    case "purchase":
      return "purchase";
    case "helpdesk":
      return "helpdesk";
    case "cto":
      return "cto";
    case "branch_manager":
      return "branch_manager";
    case "employee":
      return "employee";
    case "driver":
      return "driver";
    case "chef":
      return "chef";
    case "assistant":
      return "assistant";
    case "auditor":
      return "auditor";
    case "manager":
      return "manager";
    case "accountant":
      return "accountant";
    default:
      return (dbRole as any) || "sales";
  }
}

const USERS_STORAGE_KEY = "wazeer_org_users_v2";

function readCachedOrgUsers(): UserItem[] {
  if (typeof window === "undefined") return defaultUsers;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultUsers;
}

function writeCachedOrgUsers(users: UserItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {}
}

export function useOrgStore() {
  const [users, setUsers] = useState<UserItem[]>(() => readCachedOrgUsers());
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => defaultDepartments);
  const [positions, setPositions] = useState<PositionItem[]>(() => defaultPositions);
  const [roles, setRoles] = useState<RoleItem[]>(defaultRoles);
  const [loading, setLoading] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("departments")
        .select("*")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setDepartments(
          data.map((d: any) => ({
            id: d.id,
            code: d.code || "",
            name: { ar: d.name_ar || "", en: d.name_en || "" },
            manager: d.manager_id ? { ar: "", en: "" } : undefined,
            headcount: 0,
          }))
        );
      } else {
        setDepartments(defaultDepartments);
      }
    } catch (e) {
      console.warn("Failed to fetch departments from supabase:", e);
      setDepartments(defaultDepartments);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("positions")
        .select("*")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setPositions(
          data.map((p: any) => ({
            id: p.id,
            code: p.code || "",
            title: { ar: p.title_ar || "", en: p.title_en || "" },
            departmentId: p.department_id || "",
            level: (p.level || "staff") as PositionItem["level"],
          }))
        );
      } else {
        setPositions(defaultPositions);
      }
    } catch (e) {
      console.warn("Failed to fetch positions from supabase:", e);
      setPositions(defaultPositions);
    }
  }, []);

  const isUuid = (val?: string | null): boolean =>
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: allUserPages } = await supabase.from("user_pages").select("user_id, page_path");

      const pagesByUser = new Map<string, string[]>();
      if (allUserPages) {
        for (const up of allUserPages) {
          if (!up.user_id || !up.page_path) continue;
          const list = pagesByUser.get(up.user_id) || [];
          list.push(up.page_path);
          pagesByUser.set(up.user_id, list);
        }
      }

      if (profiles && profiles.length > 0) {
        setUsers((prev) => {
          const prevMapById = new Map(prev.map((u) => [u.id, u]));
          const prevMapByEmail = new Map(
            prev.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u])
          );

          const dbUsers: UserItem[] = profiles.map((p: any) => {
            const roleRecord = roles?.find((r: any) => r.user_id === p.id);
            const dbRole = roleRecord?.role;
            const userDbPages = pagesByUser.get(p.id);
            const cached = prevMapById.get(p.id) || (p.email ? prevMapByEmail.get(p.email.toLowerCase()) : undefined);
            const resolvedRole = dbRole ? fromDbRole(dbRole) : (cached?.role || "sales");

            const resolvedNameAr = p.full_name_ar || cached?.name?.ar || "";
            const resolvedNameEn = p.full_name_en || cached?.name?.en || resolvedNameAr;
            const resolvedDept = p.department_id || cached?.departmentId || "";
            const resolvedPos = p.position_id || cached?.positionId || "";
            const resolvedBranch = p.branch || p.helpdesk_branch || cached?.branch || cached?.helpdeskBranch || undefined;
            const resolvedPages =
              userDbPages && userDbPages.length > 0
                ? userDbPages
                : cached?.allowedPages && cached.allowedPages.length > 0
                ? cached.allowedPages
                : resolvedRole === "admin"
                ? ["*"]
                : ["/pos"];
            const resolvedActions =
              p.allowed_actions && Array.isArray(p.allowed_actions) && p.allowed_actions.length > 0
                ? p.allowed_actions
                : cached?.allowedActions && cached.allowedActions.length > 0
                ? cached.allowedActions
                : resolvedRole === "admin"
                ? ["*"]
                : [];

            return {
              id: p.id,
              name: { ar: resolvedNameAr, en: resolvedNameEn },
              email: p.email || cached?.email || "",
              avatar: p.avatar_url || cached?.avatar || "",
              departmentId: resolvedDept,
              positionId: resolvedPos,
              branch: resolvedBranch,
              role: resolvedRole,
              allowedPages: resolvedPages,
              allowedActions: resolvedActions,
              status: p.is_active !== undefined ? (p.is_active ? "active" : "inactive") : (cached?.status || "active"),
              lastActive: p.updated_at
                ? new Date(p.updated_at).toLocaleTimeString()
                : (cached?.lastActive || "الآن / Active"),
              sidebarVisible: p.sidebar_visible ?? cached?.sidebarVisible ?? true,
              employeeId: cached?.employeeId,
              employeeCode: cached?.employeeCode,
              erpPassword: cached?.erpPassword,
              helpdeskScope: p.helpdesk_scope || cached?.helpdeskScope || (resolvedRole === "admin" ? "all_tickets" : "own_created_only"),
              helpdeskBranch: p.helpdesk_branch || cached?.helpdeskBranch || resolvedBranch,
            };
          });

          const dbIds = new Set(dbUsers.map((u) => u.id));
          const dbEmails = new Set(dbUsers.map((u) => u.email.toLowerCase()).filter(Boolean));
          const localOnly = prev.filter((u) => !dbIds.has(u.id) && !dbEmails.has(u.email.toLowerCase()));
          const merged = [...dbUsers, ...localOnly];
          writeCachedOrgUsers(merged);
          return merged;
        });
      }
    } catch (e) {
      console.warn("Failed to fetch users from supabase:", e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchPositions(), fetchUsers()]).finally(
      () => {
        setLoading(false);
      }
    );

    const channelName = "org_user_pages_live_" + Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_pages" }, () => fetchUsers())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchUsers())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDepartments, fetchPositions, fetchUsers]);

  // ================= USERS CRUD =================
  const addUser = useCallback(
    async (user: UserItem) => {
      const validUuid = isUuid(user.id);
      const userId = validUuid ? user.id : crypto.randomUUID();

      const createdUser: UserItem = {
        ...user,
        id: userId,
        lastActive: "الآن / Just created",
      };

      // Optimistic update
      setUsers((prev) => {
        const next = [
          createdUser,
          ...prev.filter(
            (u) =>
              u.id !== userId &&
              (!user.email || u.email.toLowerCase() !== user.email.toLowerCase())
          ),
        ];
        writeCachedOrgUsers(next);
        return next;
      });

      try {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name_ar: user.name.ar,
          full_name_en: user.name.en || user.name.ar,
          email: user.email,
          department_id: isUuid(user.departmentId) ? user.departmentId : null,
          position_id: isUuid(user.positionId) ? user.positionId : null,
          is_active: user.status === "active",
          sidebar_visible: user.sidebarVisible ?? true,
          branch: user.branch || user.helpdeskBranch || null,
          helpdesk_scope: user.helpdeskScope || null,
          helpdesk_branch: user.branch || user.helpdeskBranch || null,
          allowed_actions: user.allowedActions || null,
        } as any);

        if (user.role) {
          // Delete old role rows first
          await supabase.from("user_roles").delete().eq("user_id", userId);

          // Try direct role insert (if enum supports it)
          const { error: directErr } = await supabase
            .from("user_roles")
            .insert({
              user_id: userId,
              role: user.role as any,
            });

          // Fallback to mapped DB enum role
          if (directErr) {
            await supabase.from("user_roles").insert({
              user_id: userId,
              role: toDbRole(user.role) as any,
            });
          }
        }

        // Sync allowed pages to public.user_pages in database
        if (user.allowedPages && user.allowedPages.length > 0) {
          try {
            await supabase.from("user_pages").delete().eq("user_id", userId);
            const validPages = user.allowedPages.filter((p) => p && p !== "*");
            if (validPages.length > 0) {
              await supabase.from("user_pages").insert(
                validPages.map((pagePath) => ({ user_id: userId, page_path: pagePath }))
              );
            }
          } catch (pageErr) {
            console.warn("Error inserting user_pages:", pageErr);
          }
        }
      } catch (e) {
        console.warn("Supabase profile upsert error:", e);
      }

      return createdUser;
    },
    []
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<UserItem>) => {
      // Optimistic update
      setUsers((prev) => {
        const next = prev.map((u) => {
          const matchById = u.id === id;
          const matchByEmail = Boolean(
            updates.email && u.email && u.email.toLowerCase() === updates.email.toLowerCase()
          );
          return matchById || matchByEmail ? { ...u, ...updates } : u;
        });
        writeCachedOrgUsers(next);
        return next;
      });

      try {
        const payload: any = {};
        if (updates.name?.ar !== undefined)
          payload.full_name_ar = updates.name.ar;
        if (updates.name?.en !== undefined)
          payload.full_name_en = updates.name.en;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.departmentId !== undefined)
          payload.department_id = isUuid(updates.departmentId) ? updates.departmentId : null;
        if (updates.positionId !== undefined)
          payload.position_id = isUuid(updates.positionId) ? updates.positionId : null;
        if (updates.status !== undefined)
          payload.is_active = updates.status === "active";
        if (updates.sidebarVisible !== undefined)
          payload.sidebar_visible = updates.sidebarVisible;
        if (updates.branch !== undefined || updates.helpdeskBranch !== undefined) {
          payload.branch = updates.branch || updates.helpdeskBranch || null;
          payload.helpdesk_branch = updates.branch || updates.helpdeskBranch || null;
        }
        if (updates.helpdeskScope !== undefined) {
          payload.helpdesk_scope = updates.helpdeskScope;
        }
        if (updates.allowedActions !== undefined) {
          payload.allowed_actions = updates.allowedActions;
        }
        payload.updated_at = new Date().toISOString();

        if (Object.keys(payload).length > 0) {
          if (isUuid(id)) {
            await supabase.from("profiles").update(payload).eq("id", id);
          } else if (updates.email) {
            await supabase.from("profiles").update(payload).eq("email", updates.email);
          }
        }

        let targetUserId = isUuid(id) ? id : null;
        if (!targetUserId && updates.email) {
          const { data: matched } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", updates.email)
            .maybeSingle();
          if (matched?.id && isUuid(matched.id)) {
            targetUserId = matched.id;
          }
        }

        if (updates.role && targetUserId) {
          // 1. Delete previous role rows for this user
          await supabase.from("user_roles").delete().eq("user_id", targetUserId);

          // 2. Try direct role insert (if enum supports it)
          const { error: directErr } = await supabase
            .from("user_roles")
            .insert({
              user_id: targetUserId,
              role: updates.role as any,
            });

          // 3. Fallback to mapped DB enum role if direct insert fails
          if (directErr) {
            const mappedRole = toDbRole(updates.role);
            await supabase.from("user_roles").insert({
              user_id: targetUserId,
              role: mappedRole as any,
            });
          }
        }

        // 4. Dynamically sync allowedPages to public.user_pages
        if (updates.allowedPages !== undefined && targetUserId) {
          try {
            await supabase.from("user_pages").delete().eq("user_id", targetUserId);
            const validPages = updates.allowedPages.filter((p) => p && p !== "*");
            if (validPages.length > 0) {
              await supabase.from("user_pages").insert(
                validPages.map((pagePath) => ({ user_id: targetUserId, page_path: pagePath }))
              );
            }
          } catch (pageErr) {
            console.warn("Error updating user_pages in DB:", pageErr);
          }
        }
      } catch (e) {
        console.warn("Supabase profile update error:", e);
      }
    },
    []
  );

  const deleteUser = useCallback(
    async (id: string) => {
      // Optimistic delete
      setUsers((prev) => prev.filter((u) => u.id !== id));

      try {
        await supabase.from("user_pages").delete().eq("user_id", id);
        await supabase.from("user_roles").delete().eq("user_id", id);
        const { error } = await supabase.from("profiles").delete().eq("id", id);
        if (error) {
          // If foreign key constraint prevents hard delete, soft delete (deactivate)
          await supabase
            .from("profiles")
            .update({ is_active: false })
            .eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase profile delete error:", e);
      }

      fetchUsers();
    },
    [fetchUsers]
  );

  // ================= DEPARTMENTS CRUD =================
  const addDepartment = useCallback(
    async (dept: DepartmentItem & { managerId?: string }) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          dept.id
        );
      const tempId = isUuid ? dept.id : crypto.randomUUID();
      const code = dept.code ? dept.code.toUpperCase() : "DEPT";

      const createdDept: DepartmentItem = {
        ...dept,
        id: tempId,
        code,
        headcount: 0,
      };

      // Optimistic update
      setDepartments((prev) => [...prev, createdDept]);

      try {
        const { data } = await supabase
          .from("departments")
          .insert({
            id: tempId,
            code,
            name_ar: dept.name.ar,
            name_en: dept.name.en || dept.name.ar,
            manager_id: (dept as any).managerId || null,
          })
          .select()
          .single();

        if (data) {
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === tempId
                ? {
                    ...d,
                    id: data.id,
                    code: data.code || d.code,
                    name: { ar: data.name_ar, en: data.name_en },
                  }
                : d
            )
          );
        }
      } catch (e) {
        console.warn("Supabase addDepartment error:", e);
      }

      fetchDepartments();
      return createdDept;
    },
    [fetchDepartments]
  );

  const updateDepartment = useCallback(
    async (
      id: string,
      updates: Partial<DepartmentItem> & { managerId?: string }
    ) => {
      // Optimistic update
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );

      try {
        const payload: any = {};
        if (updates.name?.ar !== undefined) payload.name_ar = updates.name.ar;
        if (updates.name?.en !== undefined) payload.name_en = updates.name.en;
        if (updates.code !== undefined) payload.code = updates.code.toUpperCase();
        if ((updates as any).managerId !== undefined)
          payload.manager_id = (updates as any).managerId || null;
        payload.updated_at = new Date().toISOString();

        if (Object.keys(payload).length > 0) {
          await supabase.from("departments").update(payload).eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase updateDepartment error:", e);
      }

      fetchDepartments();
    },
    [fetchDepartments]
  );

  const deleteDepartment = useCallback(
    async (id: string) => {
      // Optimistic delete
      setDepartments((prev) => prev.filter((d) => d.id !== id));

      try {
        // Unlink users & positions first to avoid FK errors
        await supabase
          .from("profiles")
          .update({ department_id: null })
          .eq("department_id", id);
        await supabase
          .from("positions")
          .update({ department_id: null })
          .eq("department_id", id);
        await supabase.from("departments").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase deleteDepartment error:", e);
      }

      fetchDepartments();
      fetchUsers();
      fetchPositions();
    },
    [fetchDepartments, fetchUsers, fetchPositions]
  );

  // ================= POSITIONS CRUD =================
  const addPosition = useCallback(
    async (pos: PositionItem) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          pos.id
        );
      const tempId = isUuid ? pos.id : crypto.randomUUID();
      const code =
        pos.code ||
        `pos-${Math.floor(1000 + Math.random() * 9000).toString()}`;

      const createdPos: PositionItem = {
        ...pos,
        id: tempId,
        code,
      };

      // Optimistic update
      setPositions((prev) => [...prev, createdPos]);

      try {
        const { data } = await supabase
          .from("positions")
          .insert({
            id: tempId,
            code,
            title_ar: pos.title.ar,
            title_en: pos.title.en || pos.title.ar,
            department_id: pos.departmentId || null,
          })
          .select()
          .single();

        if (data) {
          setPositions((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    id: data.id,
                    code: data.code || p.code,
                    title: { ar: data.title_ar, en: data.title_en },
                    level: p.level,
                  }
                : p
            )
          );
        }
      } catch (e) {
        console.warn("Supabase addPosition error:", e);
      }

      fetchPositions();
      return createdPos;
    },
    [fetchPositions]
  );

  const updatePosition = useCallback(
    async (id: string, updates: Partial<PositionItem>) => {
      // Optimistic update
      setPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      try {
        const payload: any = {};
        if (updates.title?.ar !== undefined) payload.title_ar = updates.title.ar;
        if (updates.title?.en !== undefined) payload.title_en = updates.title.en;
        if (updates.code !== undefined) payload.code = updates.code;
        if (updates.departmentId !== undefined)
          payload.department_id = updates.departmentId || null;
        if (updates.level !== undefined) payload.level = updates.level;
        payload.updated_at = new Date().toISOString();

        if (Object.keys(payload).length > 0) {
          await supabase.from("positions").update(payload).eq("id", id);
        }
      } catch (e) {
        console.warn("Supabase updatePosition error:", e);
      }

      fetchPositions();
    },
    [fetchPositions]
  );

  const deletePosition = useCallback(
    async (id: string) => {
      // Optimistic delete
      setPositions((prev) => prev.filter((p) => p.id !== id));

      try {
        // Unlink profiles referencing this position
        await supabase
          .from("profiles")
          .update({ position_id: null })
          .eq("position_id", id);
        await supabase.from("positions").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase deletePosition error:", e);
      }

      fetchPositions();
      fetchUsers();
    },
    [fetchPositions, fetchUsers]
  );

  const addRole = useCallback((newRole: RoleItem) => {
    setRoles((prev) => [...prev, newRole]);
    return newRole;
  }, []);

  const updateRole = useCallback((id: string, updates: Partial<RoleItem>) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === id || r.key === id ? { ...r, ...updates } : r))
    );
  }, []);

  const deleteRole = useCallback((id: string) => {
    setRoles((prev) => {
      const target = prev.find((r) => r.id === id || r.key === id);
      if (target?.isSystem && target.key === "admin") {
        console.warn("Cannot delete system admin role");
        return prev;
      }
      return prev.filter((r) => r.id !== id && r.key !== id);
    });
  }, []);

  return {
    users,
    departments,
    positions,
    roles,
    loading,
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
    refreshAll: useCallback(() => {
      fetchDepartments();
      fetchPositions();
      fetchUsers();
    }, [fetchDepartments, fetchPositions, fetchUsers]),
  };
}
