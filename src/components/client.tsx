"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", show: "everyone" },
  { href: "/cash-book", label: "Cash book", show: "everyone" },
  { href: "/members", label: "Members", show: "everyone" },
  { href: "/loans", label: "Loans", show: "everyone" },
  { href: "/history", label: "History", show: "user" },
  { href: "/settings", label: "Settings", show: "user" },
  { href: "/users", label: "Users", show: "admin" },
] as const;

export function Nav({ role }: { role: "admin" | "editor" | null }) {
  const pathname = usePathname();
  const visible = NAV.filter(
    (item) => item.show === "everyone" || (item.show === "user" && role) || role === "admin",
  );
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1">
      {visible.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Disables itself and shows a pending label while its form is being saved. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  size,
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass(variant, size)} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** A button that runs a server action after the person confirms. */
export function ConfirmButton({
  action,
  confirm,
  children,
  variant = "danger",
  size = "sm",
}: {
  action: (formData: FormData) => Promise<void>;
  confirm: string;
  children: ReactNode;
  variant?: "danger" | "secondary";
  size?: "sm" | "md";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <SubmitButton variant={variant} size={size} pendingLabel="Working…">
        {children}
      </SubmitButton>
    </form>
  );
}

/** A GET form (filters) that applies as soon as a select or checkbox changes. */
export function FilterForm({ children, ...props }: ComponentProps<"form">) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      method="get"
      onChange={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "SELECT" || (target as HTMLInputElement).type === "checkbox") {
          ref.current?.requestSubmit();
        }
      }}
      {...props}
    >
      {children}
    </form>
  );
}
