import { useState, useEffect, useCallback } from "react";
import {
  users as initialUsers,
  departments as initialDepartments,
  positions as initialPositions,
  type UserItem,
  type DepartmentItem,
  type PositionItem,
} from "@/lib/demo-data";

const STORAGE_KEY = "wazeer_erp_org_store_v1";

interface OrgState {
  users: UserItem[];
  departments: DepartmentItem[];
  positions: PositionItem[];
}

function loadInitial(): OrgState {
  if (typeof window === "undefined") {
    return { users: initialUsers, departments: initialDepartments, positions: initialPositions };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse org store", e);
  }
  return { users: initialUsers, departments: initialDepartments, positions: initialPositions };
}

export function useOrgStore() {
  const [state, setState] = useState<OrgState>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save org store", e);
    }
  }, [state]);

  const addUser = useCallback((user: UserItem) => {
    setState((prev) => ({ ...prev, users: [user, ...prev.users] }));
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<UserItem>) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setState((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
  }, []);

  const addDepartment = useCallback((dept: DepartmentItem) => {
    setState((prev) => ({ ...prev, departments: [...prev.departments, dept] }));
  }, []);

  const updateDepartment = useCallback((id: string, updates: Partial<DepartmentItem>) => {
    setState((prev) => ({
      ...prev,
      departments: prev.departments.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  }, []);

  const deleteDepartment = useCallback((id: string) => {
    setState((prev) => ({ ...prev, departments: prev.departments.filter((d) => d.id !== id) }));
  }, []);

  const addPosition = useCallback((pos: PositionItem) => {
    setState((prev) => ({ ...prev, positions: [...prev.positions, pos] }));
  }, []);

  const updatePosition = useCallback((id: string, updates: Partial<PositionItem>) => {
    setState((prev) => ({
      ...prev,
      positions: prev.positions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const deletePosition = useCallback((id: string) => {
    setState((prev) => ({ ...prev, positions: prev.positions.filter((p) => p.id !== id) }));
  }, []);

  return {
    users: state.users,
    departments: state.departments,
    positions: state.positions,
    addUser,
    updateUser,
    deleteUser,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addPosition,
    updatePosition,
    deletePosition,
  };
}
