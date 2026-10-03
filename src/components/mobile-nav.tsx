"use client";

/** Phone navigation: a tab bar along the bottom, with less-used pages under "More". */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  History,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UserCog,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type Role = "admin" | "editor" | null;

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/cash-book", label: "Cash book", icon: BookOpen },
  { href: "/members", label: "Members", icon: Users },
  { href: "/loans", label: "Loans", icon: Landmark },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function MobileNav({
  role,
  userName,
  logout,
}: {
  role: Role;
  userName: string | null;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const more = [
    ...(role ? [{ href: "/history", label: "Change history", icon: History }] : []),
    ...(role ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
    ...(role === "admin" ? [{ href: "/users", label: "Users", icon: UserCog }] : []),
    userName
      ? { href: "/account", label: `Your account (${userName})`, icon: UserRound }
      : { href: "/login", label: "Log in", icon: LogIn },
  ];
  const moreActive = more.some((m) => isActive(pathname, m.href));

  return (
    <div className="sm:hidden">
      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            id="more-menu"
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-surface p-2 shadow-xl"
          >
            {more.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  isActive(pathname, href) ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
            {userName && (
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  <LogOut className="size-5" />
                  Log out
                </button>
              </form>
            )}
          </div>
        </>
      )}

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    active ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  <span className={`rounded-full px-4 py-1 ${active ? "bg-accent-soft" : ""}`}>
                    <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="more-menu"
              onClick={() => setOpen((o) => !o)}
              className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                open || moreActive ? "text-accent" : "text-ink-muted"
              }`}
            >
              <span className={`rounded-full px-4 py-1 ${open || moreActive ? "bg-accent-soft" : ""}`}>
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
