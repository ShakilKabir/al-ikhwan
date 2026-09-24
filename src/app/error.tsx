"use client";

import { Button, PageHeader } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PageHeader
        title="Something went wrong"
        description="The page couldn't be loaded. Try again; if it keeps happening, the database may be waking up or unreachable."
      />
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
      {error.digest && <p className="mt-4 text-xs text-ink-muted">Error reference: {error.digest}</p>}
    </>
  );
}
