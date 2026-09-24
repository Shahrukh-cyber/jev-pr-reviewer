import { PrReviewer } from "@/components/pr-review/pr-reviewer";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { readRepositoryConfig } from "@/lib/reviews/server";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const mode = params.mode === "live" ? "live" : "demo";
  const pr = typeof params.pr === "string" && /^\d{1,9}$/.test(params.pr) ? Number(params.pr) : null;

  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1">
        <Hero />
        <PrReviewer
          howItWorks={<HowItWorks />}
          liveRepository={readRepositoryConfig()}
          initialMode={mode}
          initialPr={pr}
        />
      </main>
      <SiteFooter />
    </>
  );
}
