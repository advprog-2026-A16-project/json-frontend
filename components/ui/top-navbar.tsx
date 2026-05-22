"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/inventory", label: "Catalog" },
];

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, hasRole, logout } = useAuth();

  const isAuthPage = pathname.startsWith("/auth/");
  if (isAuthPage) return null;

  const links = [...publicLinks];

  if (isAuthenticated && hasRole("ADMIN")) {
    links.push({ href: "/orders", label: "Orders Log" });
    links.push({ href: "/admin/products", label: "Admin" });
    links.push({ href: "/admin/kyc", label: "Approve KYC" });
  } else if (isAuthenticated) {
    links.push({ href: "/orders", label: "Orders" });
    links.push({ href: "/profile/me", label: "Profile" });
    links.push({ href: "/kyc", label: "KYC" });
    if (hasRole("JASTIPER")) {
      links.push({ href: "/my/inventory", label: "My Inventory" });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-lg font-black tracking-tight text-slate-900">
          JSON Market
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden text-xs text-slate-500 md:block">{session.email ?? "Signed in"}</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/auth/login");
                }}
                className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
                Login
              </Link>
              <Link href="/auth/register" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
