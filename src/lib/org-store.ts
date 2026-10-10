import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type UserItem,
  type DepartmentItem,
  type PositionItem,
  type RoleItem,
  defaultRoles,
  users as defaultUsers,
} from "@/lib/demo-data";

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

export function useOrgStore() {
  const [users, setUsers] = useState<UserItem[]>(defaultUsers);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
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
      }
    } catch (e) {
      console.warn("Failed to fetch departments from supabase:", e);
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
      }
    } catch (e) {
      console.warn("Failed to fetch positions from supabase:", e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: roles } = await supabase.from("user_roles").select("*");

      if (profiles && profiles.length > 0) {
        const dbUsers: UserItem[] = profiles.map((p: any) => {
          const roleRecord = roles?.find((r: any) => r.user_id === p.id);
          const dbRole = roleRecord?.role;
          const resolvedRole = dbRole ? fromDbRole(dbRole) : "sales";

          return {
            id: p.id,
            name: { ar: p.full_name_ar || "", en: p.full_name_en || "" },
            email: p.email || "",
            avatar: p.avatar_url || "",
            departmentId: p.department_id || "",
            positionId: p.position_id || "",
            role: resolvedRole,
            allowedPages: ["*"],
            allowedActions: ["*"],
            status: p.is_active ? "active" : "inactive",
            lastActive: p.updated_at
              ? new Date(p.updated_at).toLocaleTimeString()
              : "الآن / Active",
            sidebarVisible: p.sidebar_visible ?? true,
          };
        });

        setUsers((prev) => {
          const dbIds = new Set(dbUsers.map((u) => u.id));
          const localOnly = prev.filter((u) => !dbIds.has(u.id));
          return [...dbUsers, ...localOnly];
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
  }, [fetchDepartments, fetchPositions, fetchUsers]);

  // ================= USERS CRUD =================
  const addUser = useCallback(
    async (user: UserItem) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id
        );
      const userId = isUuid ? user.id : crypto.randomUUID();

      const createdUser: UserItem = {
        ...user,
        id: userId,
        lastActive: "الآن / Just created",
      };

      // Optimistic update
      setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== userId)]);

      try {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name_ar: user.name.ar,
          full_name_en: user.name.en || user.name.ar,
          email: user.email,
          department_id: user.departmentId || null,
          position_id: user.positionId || null,
          is_active: user.status === "active",
          sidebar_visible: user.sidebarVisible ?? true,
        });

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
      } catch (e) {
        console.warn("Supabase profile upsert error:", e);
      }

      fetchUsers();
      return createdUser;
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<UserItem>) => {
      // Optimistic update
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));

      try {
        const payload: any = {};
        if (updates.name?.ar !== undefined)
          payload.full_name_ar = updates.name.ar;
        if (updates.name?.en !== undefined)
          payload.full_name_en = updates.name.en;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.departmentId !== undefined)
          payload.department_id = updates.departmentId || null;
        if (updates.positionId !== undefined)
          payload.position_id = updates.positionId || null;
        if (updates.status !== undefined)
          payload.is_active = updates.status === "active";
        if (updates.sidebarVisible !== undefined)
          payload.sidebar_visible = updates.sidebarVisible;
        payload.updated_at = new Date().toISOString();

        if (Object.keys(payload).length > 0) {
          await supabase.from("profiles").update(payload).eq("id", id);
        }

        if (updates.role) {
          // 1. Delete previous role rows for this user
          await supabase.from("user_roles").delete().eq("user_id", id);

          // 2. Try direct role insert (if enum supports it)
          const { error: directErr } = await supabase
            .from("user_roles")
            .insert({
              user_id: id,
              role: updates.role as any,
            });

          // 3. Fallback to mapped DB enum role if direct insert fails
          if (directErr) {
            const mappedRole = toDbRole(updates.role);
            await supabase.from("user_roles").insert({
              user_id: id,
              role: mappedRole as any,
            });
          }
        }
      } catch (e) {
        console.warn("Supabase profile update error:", e);
      }

      fetchUsers();
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      // Optimistic delete
      setUsers((prev) => prev.filter((u) => u.id !== id));

      try {
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
