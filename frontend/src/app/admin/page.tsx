"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { fetchAdminStats, fetchAdminUsers, updateAdminUser } from "@/lib/api";
import type { AdminStats, AdminUsersResponse, User } from "@/lib/types";
import ConfirmModal from "@/components/confirm-modal";
import Toast from "@/components/toast";

const PAGE_SIZE = 20;

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersResp, setUsersResp] = useState<AdminUsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; kind?: string } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.tier !== "admin")) {
      router.replace("/");
      return;
    }
    if (!loading && user && user.tier === "admin") {
      loadStats();
      loadUsers(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, page]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const s = await fetchAdminStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadUsers(p = 1) {
    setLoadingUsers(true);
    try {
      const r = await fetchAdminUsers(p, PAGE_SIZE);
      setUsersResp(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }

  // Confirmation flow: open modal first
  function confirmChangeTier(id: number, newTier: string, oldTier: string, email: string) {
    setConfirmPayload({ type: "tier", id, newTier, oldTier, email });
    setConfirmOpen(true);
  }

  function confirmToggleActive(id: number, newActive: boolean, email: string) {
    setConfirmPayload({ type: "toggle", id, newActive, email });
    setConfirmOpen(true);
  }

  async function executeConfirm() {
    if (!confirmPayload) return;
    const { type, id, newTier, newActive } = confirmPayload;
    setConfirmOpen(false);
    setUpdatingUser(id);
    try {
      if (type === "tier") {
        await updateAdminUser(id, { tier: newTier });
        setToast({ message: `Tier updated to ${newTier}`, kind: "success" });
      } else if (type === "toggle") {
        await updateAdminUser(id, { is_active: newActive });
        setToast({ message: newActive ? "User activated" : "User deactivated", kind: "success" });
      }
      await loadUsers(page);
    } catch (e: any) {
      console.error(e);
      setToast({ message: e?.message ?? "Action failed", kind: "error" });
    } finally {
      setUpdatingUser(null);
      setConfirmPayload(null);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {(loadingStats || !stats ? new Array(6).fill(null) : [
          { label: "Users", value: stats.users.total },
          { label: "Freemium", value: stats.users.freemium },
          { label: "Pro", value: stats.users.pro },
          { label: "Admin", value: stats.users.admin },
          { label: "Feeds", value: stats.feeds.total },
          { label: "Events", value: stats.events.total },
        ]).map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {s ? (
              <>
                <div className="text-xs text-[var(--muted)] uppercase font-semibold">{s.label}</div>
                <div className="text-2xl font-bold">{s.value}</div>
              </>
            ) : (
              <div className="animate-pulse h-12 bg-[var(--surface-hover)] rounded" />
            )}
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Users</h2>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded bg-[var(--surface-hover)]"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-sm text-[var(--muted)]">Page {page}</span>
            <button
              className="px-3 py-1 rounded bg-[var(--surface-hover)]"
              disabled={usersResp ? usersResp.items.length < PAGE_SIZE : true}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-[var(--muted)]">
                <th className="py-2">User</th>
                <th className="py-2">Tier</th>
                <th className="py-2">Status</th>
                <th className="py-2">Joined</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers || !usersResp ? (
                new Array(5).fill(null).map((_, i) => (
                  <tr key={i} className="odd:bg-[var(--surface-hover)]">
                    <td className="py-3"><div className="h-4 w-48 bg-[var(--surface-hover)] rounded animate-pulse" /></td>
                    <td className="py-3"><div className="h-4 w-24 bg-[var(--surface-hover)] rounded animate-pulse" /></td>
                    <td className="py-3"><div className="h-4 w-16 bg-[var(--surface-hover)] rounded animate-pulse" /></td>
                    <td className="py-3"><div className="h-4 w-32 bg-[var(--surface-hover)] rounded animate-pulse" /></td>
                    <td className="py-3"><div className="h-6 w-24 bg-[var(--surface-hover)] rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : (
                usersResp.items.map((u: User) => (
                  <tr key={u.id} className="odd:bg-[var(--surface-hover)]">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">{(u.name || u.email).slice(0,2).toUpperCase()}</div>
                        <div>
                          <div className="font-medium text-sm">{u.name || u.email}</div>
                          <div className="text-xs text-[var(--muted)]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <select
                        value={u.tier}
                        onChange={(e) => confirmChangeTier(u.id, e.target.value, u.tier, u.email)}
                        disabled={updatingUser === u.id || (user && user.id === u.id)}
                        className="input"
                        style={{ width: 140 }}
                      >
                        <option value="freemium">Free</option>
                        <option value="pro">Pro</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <span className="text-sm" style={{ color: u.is_active ? "var(--success)" : "var(--muted)" }}>{u.is_active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      {user && user.id === u.id ? (
                        <span className="px-3 py-1 rounded" style={{ background: "var(--surface)" }}>You</span>
                      ) : (
                        <button
                          onClick={() => confirmToggleActive(u.id, !u.is_active, u.email)}
                          disabled={updatingUser === u.id}
                          className="px-3 py-1 rounded"
                          style={u.is_active ? { border: "1px solid var(--danger)", color: "var(--danger)", background: "transparent" } : { border: "1px solid var(--success)", color: "var(--success)", background: "transparent" }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {confirmOpen && confirmPayload && (
        <ConfirmModal
          open={confirmOpen}
          title={confirmPayload.type === "tier" ? "Change user tier" : "Confirm action"}
          description={confirmPayload.type === "tier" ? `Change ${confirmPayload.email} to ${confirmPayload.newTier}?` : `${confirmPayload.newActive ? "Activate" : "Deactivate"} ${confirmPayload.email}?`}
          confirmLabel={confirmPayload.type === "tier" ? "Change Tier" : (confirmPayload.newActive ? "Activate" : "Deactivate")}
          onConfirm={executeConfirm}
          onClose={() => setConfirmOpen(false)}
        />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind === "error" ? "error" : toast.kind === "success" ? "success" : "info"} />}
    </div>
  );
}
