import { LinkButton, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not found" description="This page or record doesn't exist. It may have been deleted." />
      <LinkButton href="/">Go to the dashboard</LinkButton>
    </>
  );
}
