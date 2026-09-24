import Image from "next/image";
import type { ReactNode } from "react";

/** The centred card used by the login and setup pages. */
export function AuthCard({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 rounded-lg bg-white p-1">
          <Image src="/logo.png" alt="" width={72} height={72} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      </div>
      <div className="rounded-lg border border-line bg-surface p-5">{children}</div>
    </div>
  );
}
