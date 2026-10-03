import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/client";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logout } from "@/app/login/actions";
import "./globals.css";

// Every page shows live figures from the database, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Al-Ikhwan", template: "%s · Al-Ikhwan" },
  description: "Cash book, members and dues for Al-Ikhwan club.",
  // There is no login yet, so keep the site out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Lets the phone tab bar sit above the home indicator (env(safe-area-inset-bottom)).
  viewportFit: "cover",
  themeColor: [
    // Matches the green header phones show (--brand-bar).
    { media: "(prefers-color-scheme: light)", color: "#15692f" },
    { media: "(prefers-color-scheme: dark)", color: "#164a29" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only for showing who is logged in; every page and action checks access itself.
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* On phones the header is a green bar and navigation moves to a tab bar at the bottom. */}
        <header className="bg-linear-to-r from-brand-bar to-brand-bar-end text-white sm:border-b sm:border-line sm:bg-none sm:bg-surface sm:text-ink">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:py-3">
            <Link href="/" className="flex items-center gap-2">
              {/* The logo's lettering is dark, so it sits on white in both themes. */}
              <span className="rounded-md bg-white p-0.5">
                <Image src="/logo.png" alt="" width={40} height={40} priority />
              </span>
              <span className="text-lg font-semibold tracking-tight">Al-Ikhwan</span>
            </Link>
            <div className="hidden sm:block sm:flex-1">
              <Nav role={user?.role ?? null} />
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="max-sm:rounded-full max-sm:bg-white/15 max-sm:px-3 max-sm:py-1 max-sm:font-medium sm:text-ink-secondary sm:hover:text-ink sm:hover:underline"
                  >
                    {user.name}
                  </Link>
                  <form action={logout} className="hidden sm:block">
                    <button type="submit" className="text-ink-muted hover:text-ink hover:underline">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="font-medium max-sm:rounded-full max-sm:bg-white max-sm:px-3 max-sm:py-1 max-sm:text-accent sm:text-accent sm:hover:underline"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        {/* Bottom padding on phones keeps the footer clear of the tab bar. */}
        <footer className="border-t border-line pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-center text-xs text-ink-muted sm:pb-4">
          Al-Ikhwan · Victory starts with unity
        </footer>
        <MobileNav role={user?.role ?? null} userName={user?.name ?? null} logout={logout} />
      </body>
    </html>
  );
}
