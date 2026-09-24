import { JevMark } from "@/components/ui/icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <JevMark className="size-3.5" />
          Jev PR Reviewer — a demo built on Jev&apos;s structured decision API.
        </p>
        <p>GitHub automation shown here is simulated. Decisions come from Jev; labels are derived by this app.</p>
      </div>
    </footer>
  );
}
