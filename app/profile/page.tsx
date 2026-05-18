"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { profileApi } from "@/lib/api";
import type { MyProfileResponse } from "@/lib/api/profile";

type ProfileForm = {
  username: string;
  fullName: string;
  bio: string;
};

function ProfileContent() {
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>({ username: "", fullName: "", bio: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await profileApi.me();
        setProfile(me);
        setForm({
          username: me.username ?? "",
          fullName: me.fullName ?? "",
          bio: me.bio ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

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
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-gray-600">Loading profile...</div>;
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {error && <p className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="mb-3 rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <div className="mb-4 rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>
          Email: <span className="font-medium">{profile?.email ?? "-"}</span>
        </p>
        <p>
          Role: <span className="font-medium">{profile?.role ?? "-"}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
          <input
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
          <input
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            className="h-28 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
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
