import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TodoStatus = "paid" | "pending" | "has_issue";

export interface TodoCommitmentItem {
  id: string;
  date: string; // YYYY-MM-DD
  taskName: string;
  taskNameEn?: string;
  ref: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: TodoStatus;
  repeatingMonthly: boolean;
  category?: string;
  branchId?: string;
  notes?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "wazeer_erp_todo_commitments_v2";

function loadLocalItems(): TodoCommitmentItem[] {
  if (typeof window === "undefined") return [];
  try {
    // Purge previous mock seed data
    if (localStorage.getItem("wazeer_erp_todo_commitments_v1")) {
      localStorage.removeItem("wazeer_erp_todo_commitments_v1");
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item: TodoCommitmentItem) => !item.id?.startsWith("td-00"))
      : [];
  } catch (err) {
    console.warn("Failed to load local todo items:", err);
    return [];
  }
}

function saveLocalItems(items: TodoCommitmentItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Failed to save local todo items:", err);
  }
}

let sharedItems: TodoCommitmentItem[] = loadLocalItems();
const listeners = new Set<() => void>();

function notify() {
  saveLocalItems(sharedItems);
  listeners.forEach((l) => l());
}

async function syncWithSupabase() {
  try {
    const { data, error } = await supabase
      .from("todo_commitments")
      .select("*")
      .order("due_date", { ascending: true });

    if (!error && Array.isArray(data)) {
      sharedItems = data.map((d: any) => ({
        id: d.id,
        date: d.date || new Date().toISOString().slice(0, 10),
        taskName: d.task_name,
        taskNameEn: d.task_name_en || undefined,
        ref: d.ref || "",
        amount: Number(d.amount || 0),
        dueDate: d.due_date || d.date,
        status: (d.status as TodoStatus) || "pending",
        repeatingMonthly: Boolean(d.repeating_monthly),
        category: d.category || undefined,
        branchId: d.branch_id || undefined,
        notes: d.notes || undefined,
        paidAt: d.paid_at || undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      notify();
    }
  } catch (err) {
    // Graceful offline fallback
    console.debug("Supabase todo_commitments fetch fallback to local:", err);
  }
}

// Initial fetch & realtime subscription
if (typeof window !== "undefined") {
  syncWithSupabase();
  try {
    const channel = supabase
      .channel("todo_commitments_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_commitments" }, () => {
        syncWithSupabase();
      });
    channel.subscribe();
  } catch {
    // Ignore realtime setup error
  }
}

export function useTodoStore() {
  const [items, setItems] = useState<TodoCommitmentItem[]>(sharedItems);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const update = () => setItems([...sharedItems]);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const addTodo = useCallback(async (item: Omit<TodoCommitmentItem, "id">) => {
    setLoading(true);
    const newId = `td-${Date.now()}`;
    const newItem: TodoCommitmentItem = {
      ...item,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sharedItems = [newItem, ...sharedItems];
    notify();

    // Persist to Supabase if available
    try {
      const { data, error } = await supabase
        .from("todo_commitments")
        .insert({
          date: item.date,
          task_name: item.taskName,
          task_name_en: item.taskNameEn || null,
          ref: item.ref || null,
          amount: item.amount,
          due_date: item.dueDate,
          status: item.status,
          repeating_monthly: item.repeatingMonthly,
          category: item.category || null,
          branch_id: item.branchId || null,
          notes: item.notes || null,
          paid_at: item.status === "paid" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (!error && data?.id) {
        sharedItems = sharedItems.map((it) => (it.id === newId ? { ...it, id: data.id } : it));
        notify();
      }
    } catch (err) {
      console.warn("Could not insert to Supabase todo_commitments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTodo = useCallback(async (id: string, updates: Partial<TodoCommitmentItem>) => {
    setLoading(true);
    sharedItems = sharedItems.map((it) =>
      it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it
    );
    notify();

    try {
      const dbUpdate: any = {};
      if (updates.date !== undefined) dbUpdate.date = updates.date;
      if (updates.taskName !== undefined) dbUpdate.task_name = updates.taskName;
      if (updates.taskNameEn !== undefined) dbUpdate.task_name_en = updates.taskNameEn;
      if (updates.ref !== undefined) dbUpdate.ref = updates.ref;
      if (updates.amount !== undefined) dbUpdate.amount = updates.amount;
      if (updates.dueDate !== undefined) dbUpdate.due_date = updates.dueDate;
      if (updates.status !== undefined) {
        dbUpdate.status = updates.status;
        dbUpdate.paid_at = updates.status === "paid" ? new Date().toISOString() : null;
      }
      if (updates.repeatingMonthly !== undefined) dbUpdate.repeating_monthly = updates.repeatingMonthly;
      if (updates.category !== undefined) dbUpdate.category = updates.category;
      if (updates.branchId !== undefined) dbUpdate.branch_id = updates.branchId;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes;

      if (Object.keys(dbUpdate).length > 0) {
        await supabase.from("todo_commitments").update(dbUpdate).eq("id", id);
      }
    } catch (err) {
      console.warn("Could not update todo_commitments in Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    setLoading(true);
    sharedItems = sharedItems.filter((it) => it.id !== id);
    notify();

    try {
      await supabase.from("todo_commitments").delete().eq("id", id);
    } catch (err) {
      console.warn("Could not delete from todo_commitments in Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRepeatingMonthly = useCallback((id: string) => {
    const item = sharedItems.find((it) => it.id === id);
    if (!item) return;
    updateTodo(id, { repeatingMonthly: !item.repeatingMonthly });
  }, [updateTodo]);

  const setTodoStatus = useCallback(
    (id: string, newStatus: TodoStatus) => {
      updateTodo(id, {
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date().toISOString() : undefined,
      });
    },
    [updateTodo]
  );

  const importTodos = useCallback(async (newItems: Omit<TodoCommitmentItem, "id">[]) => {
    if (!newItems || newItems.length === 0) return 0;
    setLoading(true);

    const timestamp = Date.now();
    const mapped: TodoCommitmentItem[] = newItems.map((item, idx) => ({
      ...item,
      id: `td-${timestamp}-${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    sharedItems = [...mapped, ...sharedItems];
    notify();

    try {
      const recordsToInsert = newItems.map((item) => ({
        date: item.date,
        task_name: item.taskName,
        task_name_en: item.taskNameEn || null,
        ref: item.ref || null,
        amount: item.amount,
        due_date: item.dueDate,
        status: item.status,
        repeating_monthly: item.repeatingMonthly,
        category: item.category || null,
        branch_id: item.branchId || null,
        notes: item.notes || null,
        paid_at: item.status === "paid" ? new Date().toISOString() : null,
      }));

      const { data, error } = await supabase
        .from("todo_commitments")
        .insert(recordsToInsert)
        .select();

      if (!error && data && data.length > 0) {
        await syncWithSupabase();
      }
    } catch (err) {
      console.warn("Bulk import to Supabase todo_commitments error:", err);
    } finally {
      setLoading(false);
    }

    return newItems.length;
  }, []);

  return {
    items,
    loading,
    addTodo,
    importTodos,
    updateTodo,
    deleteTodo,
    toggleRepeatingMonthly,
    setTodoStatus,
    refreshTodos: syncWithSupabase,
  };
}

