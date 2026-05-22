"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { profileApi } from "@/lib/api";
import type { MyProfileResponse } from "@/lib/api/profile";
import { patchSessionIdentity } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";

type ProfileForm = {
  username: string;
  fullName: string;
  bio: string;
};

function ProfileContent() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>({ username: "", fullName: "", bio: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="rounded-[28px] bg-[#2563eb] p-7 text-white shadow-sm">
            <div className="flex items-center gap-5">
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${
                  form.username || "user"
                }`}
                alt="Profile Avatar"
                className="h-24 w-24 rounded-full border-4 border-white/30 bg-white object-cover"
              />

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                  Akun Saya
                </p>

                <h2 className="mt-2 text-3xl font-black leading-tight">
                  {profile?.fullName || form.fullName || "Lengkapi nama profil"}
                </h2>

                <p className="mt-1 text-sm text-blue-100">
                  @{form.username || "username"}
                </p>

                <p className="mt-1 text-sm text-blue-100">
                  {profile?.email ?? session.email ?? "-"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#2563eb] hover:bg-blue-50"
            >
              Edit Profil
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Ringkasan Profil
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rating
                </p>

                <h3 className="mt-2 text-3xl font-black text-[#2563eb]">
                  {profile?.rating ? profile.rating.toFixed(1) : "-"}
                </h3>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Transaksi
                </p>

                <h3 className="mt-2 text-3xl font-black text-slate-900">
                  {profile?.successfulTransactions || 0}
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Username:</span>{" "}
                @{form.username || "-"}
              </p>

              <p>
                <span className="font-semibold text-slate-900">Nama lengkap:</span>{" "}
                {form.fullName || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Tentang Saya
          </p>

          <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">
            {form.bio || "Belum ada bio."}
          </p>
        </div>

        {error && (
          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Coba Muat Ulang
          </button>
        )}

        {isEditOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setIsEditOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">
                  Edit Profil
                </h2>

                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Tutup
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Username
                  </label>

                  <input
                    value={form.username}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nama Lengkap
                  </label>

                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        fullName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Bio Singkat
                  </label>

                  <textarea
                    value={form.bio}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
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