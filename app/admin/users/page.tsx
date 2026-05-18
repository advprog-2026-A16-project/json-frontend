"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Users</h1>
            <p className="text-sm text-gray-500">Role and account-status governance.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Products
            </Link>
            <Link href="/admin/kyc" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              KYC
            </Link>
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {error && (
          <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
        )}

        {loading && <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">Loading...</section>}

        {!loading && users.length === 0 && !error && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            No users found.
          </section>
        )}

        {!loading && users.length > 0 && (
          <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
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
                          className="rounded-md border border-gray-300 px-2 py-1"
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
                          className="rounded-md border border-gray-300 px-2 py-1"
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
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
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
