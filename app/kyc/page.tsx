"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner } from "@/components/ui/feedback";
import { profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";

type KycForm = {
  fullName: string;
  identityNumber: string;
  socialMediaLink: string;
};

function KycContent() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [form, setForm] = useState<KycForm>({
    fullName: "",
    identityNumber: "",
    socialMediaLink: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isAdmin = hasRole("ADMIN");

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin/kyc");
    }
  }, [isAdmin, router]);

  if (isAdmin) {
    return <div className="p-6 text-sm text-gray-600">Redirecting to admin KYC queue...</div>;
  }

  const updateField = (key: keyof KycForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await profileApi.submitKyc({
        fullName: form.fullName.trim(),
        identityNumber: form.identityNumber.trim(),
        socialMediaLink: form.socialMediaLink.trim(),
      });
      setSuccess("KYC submitted successfully.");
      setForm({ fullName: "", identityNumber: "", socialMediaLink: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">KYC Submission</h1>
        <Link href="/inventory" className="text-sm text-blue-600 hover:underline">
          Back to Catalog
        </Link>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Submit KYC data for identity verification before jastiper operations.
      </p>

      {error && <Banner tone="error" className="mb-3">{error}</Banner>}
      {success && <Banner tone="success" className="mb-3">{success}</Banner>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full Name (KTP)</label>
          <input
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Identity Number</label>
          <input
            value={form.identityNumber}
            onChange={(event) => updateField("identityNumber", event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Social Media Link</label>
          <input
            value={form.socialMediaLink}
            onChange={(event) => updateField("socialMediaLink", event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="https://instagram.com/username"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit KYC"}
        </button>
      </form>
    </div>
  );
}

export default function KycPage() {
  return (
    <AuthGuard requireAuth>
      <KycContent />
    </AuthGuard>
  );
}
