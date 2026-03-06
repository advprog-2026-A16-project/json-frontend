import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="mb-3 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600">
          JaStip Online Nasional (JSON)
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Frontend Staging</h1>
        <p className="mb-8 max-w-2xl text-sm text-gray-600">
          Halaman ini dipakai sebagai entry point pengujian integrasi frontend-backend untuk milestone 25%.
          Gunakan menu di bawah untuk login/register atau langsung coba inventory module.
        </p>

        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
          <Link
            href="/inventory"
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Buka Inventory
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-100"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-100"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
