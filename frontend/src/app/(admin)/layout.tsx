"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import {
  IconDashboard,
  IconAssets,
  IconIssues,
  IconLogout,
  IconLogo,
} from "@/components/icons";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/assets", label: "Assets", icon: IconAssets },
  { href: "/issues", label: "Issues", icon: IconIssues },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[--color-text-subtle]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-[--color-border] bg-[--color-surface] lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--color-primary] text-[--color-primary-contrast]">
            <IconLogo className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[--color-text]">
            MaintainIQ
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-[--color-primary-soft] text-[--color-primary]"
                    : "text-[--color-text-muted] hover:bg-[--color-surface-muted] hover:text-[--color-text]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[--color-border] p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[--color-primary-soft] text-sm font-bold text-[--color-primary]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[--color-text]">
                {user.name}
              </p>
              <p className="truncate text-xs text-[--color-text-subtle]">
                {user.role}
              </p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="rounded-lg p-2 text-[--color-text-subtle] hover:bg-[--color-surface-muted] hover:text-[--color-danger] transition-colors cursor-pointer"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        {/* Mobile top nav */}
        <header className="flex items-center justify-between border-b border-[--color-border] bg-[--color-surface] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--color-primary] text-[--color-primary-contrast]">
              <IconLogo className="h-4 w-4" />
            </div>
            <span className="font-bold text-[--color-text]">MaintainIQ</span>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="rounded-lg p-2 text-[--color-text-subtle] hover:bg-[--color-surface-muted] cursor-pointer"
          >
            <IconLogout className="h-5 w-5" />
          </button>
        </header>

        <nav className="flex gap-1 border-b border-[--color-border] bg-[--color-surface] px-2 py-2 lg:hidden">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${
                  active
                    ? "bg-[--color-primary-soft] text-[--color-primary]"
                    : "text-[--color-text-muted]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
