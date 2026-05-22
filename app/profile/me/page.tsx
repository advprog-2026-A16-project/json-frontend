"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { profileApi, authApi } from "@/lib/api";
import type { MyProfileResponse } from "@/lib/api/profile";
import { patchSessionIdentity } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";

type ProfileForm = {
  username: string;
  fullName: string;
  bio: string;
};

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function ProfileContent() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>({ username: "", fullName: "", bio: "" });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadProfile = async () => {
    setError("");
    setIsLoading(true);
    try {
      const me = await profileApi.me();
      patchSessionIdentity({ role: me.role, userId: me.userId, email: me.email });
      setProfile(me);
      setForm({
        username: me.username ?? "",
        fullName: me.fullName ?? "",
        bio: me.bio ?? "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat profil.";
      setError(message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session.token) return;
    void loadProfile();
  }, [session.token]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const updated = await profileApi.updateMe({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        bio: form.bio.trim(),
      });

      setProfile(updated);
      setForm({
        username: updated.username ?? "",
        fullName: updated.fullName ?? "",
        bio: updated.bio ?? "",
      });
      setSuccess("Profil berhasil diperbarui.");
      setIsEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess("Password berhasil diperbarui.");
      setIsPasswordOpen(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderRoleBadge = (role?: string) => {
    if (!role) return null;
    const config: Record<string, { label: string; className: string }> = {
      ADMIN: { label: "Administrator", className: "bg-rose-500 text-white shadow-sm" },
      JASTIPER: { label: "Verified Jastiper", className: "bg-emerald-400 text-emerald-950 shadow-sm" },
      TITIPERS: { label: "Titipers", className: "bg-amber-400 text-amber-950 shadow-sm" },
    };
    const current = config[role] || { label: role, className: "bg-slate-100 text-slate-800 shadow-sm" };
    
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${current.className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
        {current.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <StateCard message="Memuat profil..." className="rounded-2xl bg-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-6 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Profil</p>
            <h1 className="text-3xl font-black text-slate-900">Akun Saya</h1>
          </div>
          <Link href="/inventory" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Kembali ke Katalog
          </Link>
        </div>

        {error && <Banner tone="error" className="mb-3">{error}</Banner>}
        {success && <Banner tone="success" className="mb-3">{success}</Banner>}

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex flex-col justify-between rounded-[28px] bg-[#2563eb] p-7 text-white shadow-sm">
            <div className="flex items-center gap-5">
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${form.username || "user"}`}
                alt="Profile Avatar"
                className="h-24 w-24 rounded-full border-4 border-white/30 bg-white object-cover"
              />

              <div className="space-y-2">
                <div>{renderRoleBadge(profile?.role)}</div>
                <h2 className="text-3xl font-black leading-tight">
                  {profile?.fullName || form.fullName || "Lengkapi nama profil"}
                </h2>
                <p className="text-sm text-blue-100">@{form.username || "username"}</p>
                <p className="text-sm text-blue-100">{profile?.email ?? session.email ?? "-"}</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#2563eb] hover:bg-blue-50"
              >
                Edit Profil
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <img
                    src="https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/outline/settings.svg"
                    alt="Settings"
                    className="h-5 w-5 invert"
                  />
                </button>

                {isSettingsOpen && (
                  <div className="absolute left-14 top-1/2 z-20 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsPasswordOpen(true);
                      }}
                      className="block w-full whitespace-nowrap px-5 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Ganti Password
                    </button>
                  </div>
                )}
              </div>


            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Profil Pengguna</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rating</p>
                <h3 className="mt-2 text-3xl font-black text-[#2563eb]">{profile?.rating ? profile.rating.toFixed(1) : "-"}</h3>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transaksi</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">{profile?.successfulTransactions || 0}</h3>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Username:</span> @{form.username || "-"}</p>
              <p><span className="font-semibold text-slate-900">Nama lengkap:</span> {form.fullName || "-"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bio</p>
          <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">{form.bio || "Belum ada bio."}</p>
        </div>

        {error && (
          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mb-4 mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Coba Muat Ulang
          </button>
        )}

        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsEditOpen(false)}>
            <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Edit Profil</h2>
                <button type="button" onClick={() => setIsEditOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Tutup</button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                  <input
                    value={form.username}
                    onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <input
                    value={form.fullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Bio Singkat</label>
                  <textarea
                    value={form.bio}
                    onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                    className="h-32 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </form>
            </div>
          </div>
        )}

        {isPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsPasswordOpen(false)}>
            <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Ganti Password</h2>
                <button type="button" onClick={() => setIsPasswordOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Tutup</button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password Lama</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isChangingPassword ? "Memproses..." : "Perbarui Password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard requireAuth>
      <ProfileContent />
    </AuthGuard>
  );
}