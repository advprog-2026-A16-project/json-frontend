"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { adminApi } from "@/lib/api";
import type { AccountStatus, AdminUser } from "@/lib/api/admin";
import type { UserRole } from "@/lib/auth/types";

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "JASTIPER", "TITIPERS"];
const STATUS_OPTIONS: AccountStatus[] = ["ACTIVE", "BANNED", "PENDING", "PENDING_VERIFICATION"];

type UserDraft = {
  role: UserRole;
  accountStatus: AccountStatus;
};

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listUsers();
      const normalized = Array.isArray(data) ? data : [];
      setUsers(normalized);
      const nextDrafts: Record<string, UserDraft> = {};
      normalized.forEach((user) => {
        nextDrafts[user.userId] = { role: user.role, accountStatus: user.accountStatus };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
      setUsers([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const saveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    setSavingUserId(userId);
    setError("");
    try {
      const updated = await adminApi.updateUserStatus(userId, {
        role: draft.role,
        accountStatus: draft.accountStatus,
      });
      setUsers((prev) => prev.map((user) => (user.userId === userId ? updated : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</p>
            <h1 className="text-2xl font-black text-slate-900">Kelola Pengguna</h1>
            <p className="text-sm text-slate-500">Atur role dan status akun pengguna dari satu panel terpusat.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Produk
            </Link>
            <Link href="/admin/kyc" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              KYC
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-6 rounded-[28px] bg-[#2563eb] p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Total pengguna</p>
          <p className="mt-3 text-3xl font-black">{users.length}</p>
          <p className="mt-2 text-sm text-blue-100">Perubahan role dan status akan tersimpan per pengguna.</p>
        </section>

        {error && <Banner tone="error" className="mb-4">{error}</Banner>}

        {loading && <StateCard message="Memuat data pengguna..." className="rounded-2xl bg-white" />}

        {!loading && users.length === 0 && !error && (
          <StateCard message="Tidak ada pengguna yang ditemukan." className="rounded-2xl bg-white" />
        )}

        {!loading && users.length > 0 && (
          <section className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const draft = drafts[user.userId] ?? {
                    role: user.role,
                    accountStatus: user.accountStatus,
                  };
                  const isSaving = savingUserId === user.userId;

                  return (
                    <tr key={user.userId} className="border-b border-gray-100 last:border-none">
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3 text-gray-600">{user.username || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{user.fullName || "-"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={draft.role}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [user.userId]: {
                                ...draft,
                                role: e.target.value as UserRole,
                              },
                            }))
                          }
                          className="rounded-xl border border-slate-300 px-2 py-1"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={draft.accountStatus}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [user.userId]: {
                                ...draft,
                                accountStatus: e.target.value as AccountStatus,
                              },
                            }))
                          }
                          className="rounded-xl border border-slate-300 px-2 py-1"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void saveUser(user.userId)}
                          className="rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isSaving ? "Menyimpan..." : "Simpan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAuth roles={["ADMIN"]}>
      <AdminUsersContent />
    </AuthGuard>
  );
}
