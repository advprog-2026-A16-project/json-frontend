"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userApi } from "@/lib/api";
import type { PublicProfileResponse } from "@/lib/api/user";
import { StateCard, Banner } from "@/components/ui/feedback";

type ExtendedPublicProfile = PublicProfileResponse & { role?: string };

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<ExtendedPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await userApi.getPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProfile();
  }, [userId]);

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
      <div className="mx-auto max-w-2xl p-10">
        <StateCard message="Memuat profil pengguna..." className="rounded-2xl bg-white" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Banner tone="error">{error || "Profil tidak ditemukan"}</Banner>
          <button 
            onClick={() => router.back()}
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-6 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Profil Pengguna
            </p>

            <h1 className="text-3xl font-black text-slate-900">
              {profile.fullName || profile.username || "Pengguna"}
            </h1>
          </div>

          <button
            onClick={() => router.back()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            &larr; Kembali
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] bg-[#2563eb] p-7 text-white shadow-sm">
            <div className="flex items-center gap-5">
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${
                  profile.username || "user"
                }`}
                alt="Profile Avatar"
                className="h-24 w-24 rounded-full border-4 border-white/30 bg-white object-cover"
              />

              <div className="space-y-2">
                <div>
                  {renderRoleBadge(profile.role)}
                </div>

                <h2 className="text-3xl font-black leading-tight">
                  {profile.fullName || "Pengguna"}
                </h2>

                <p className="text-sm text-blue-100">
                  @{profile.username}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Profil Pengguna
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rating
                </p>

                <h3 className="mt-2 text-3xl font-black text-[#2563eb]">
                  {profile.rating > 0 ? profile.rating.toFixed(1) : "-"}
                </h3>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Transaksi
                </p>

                <h3 className="mt-2 text-3xl font-black text-slate-900">
                  {profile.successfulTransactions || 0}
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">
                  Username:
                </span>{" "}
                @{profile.username}
              </p>

              <p>
                <span className="font-semibold text-slate-900">
                  Nama Lengkap:
                </span>{" "}
                {profile.fullName || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Bio
          </p>

          <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">
            {profile.bio ||
              "Belum ada bio."}
          </p>
        </div>
      </div>
    </div>
  );
}