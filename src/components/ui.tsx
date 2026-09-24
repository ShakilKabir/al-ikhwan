/**
 * Small building blocks shared by every page. Styling uses the colour tokens
 * from globals.css (bg-surface, text-ink-muted, …).
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatMoney } from "@/lib/format";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover border-transparent",
  secondary: "bg-surface text-ink hover:bg-surface-muted border-line-strong",
  danger: "bg-surface text-danger hover:bg-danger-soft border-line-strong",
  ghost: "bg-transparent text-ink-secondary hover:bg-surface-muted border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md") {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}`;
}

export function LinkButton({
  variant,
  size,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function Button({
  variant,
  size,
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-ink-muted hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

/** A labelled headline figure. `hero` makes it the page's one big number. */
export function StatTile({
  label,
  value,
  hint,
  hero = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hero?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className={`mt-1 font-semibold tracking-tight ${hero ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular ${className}`}>{formatMoney(value)}</span>;
}

/** "+1,000.00" or "−1,300.00": used on phones where two amount columns share one. */
export function SignedAmount({ value, negative = false }: { value: number; negative?: boolean }) {
  return (
    <span className="tabular whitespace-nowrap font-medium">
      {negative ? "−" : "+"}
      {formatMoney(value)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "danger";
}) {
  const tones = {
    neutral: "bg-surface-muted text-ink-secondary",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-ink-muted">{children}</p>;
}

export function Alert({ children, tone = "danger" }: { children: ReactNode; tone?: "danger" | "info" }) {
  const tones = {
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-line bg-surface-muted text-ink-secondary",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export const controlClass =
  "block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-danger">
          {error.join(" ")}
        </p>
      )}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${controlClass} ${className}`} rows={3} {...props} />;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-line bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-line px-3 py-2 align-top ${align === "right" ? "text-right tabular" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
