import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/client";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only for showing who is logged in; every page and action checks access itself.
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              {/* The logo's lettering is dark, so it sits on white in both themes. */}
              <span className="rounded-md bg-white p-0.5">
                <Image src="/logo.png" alt="" width={40} height={40} priority />
              </span>
              <span className="text-lg font-semibold tracking-tight">Al-Ikhwan</span>
            </Link>
            <div className="order-last w-full sm:order-0 sm:w-auto sm:flex-1">
              <Nav role={user?.role ?? null} />
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
              {user ? (
                <>
                  <Link href="/account" className="text-ink-secondary hover:text-ink hover:underline">
                    {user.name}
                  </Link>
                  <form action={logout}>
                    <button type="submit" className="text-ink-muted hover:text-ink hover:underline">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="font-medium text-accent hover:underline">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line py-4 text-center text-xs text-ink-muted">
          Al-Ikhwan · Victory starts with unity
        </footer>
      </body>
    </html>
  );
}
