import { isConfiguredRepository, liveError, liveErrorFrom, loadPullReview, readRepositoryConfig } from "@/lib/reviews/server";

/** GET /api/reviews/:owner/:repo/:number — one PR with its stored Jev review and lifecycle. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> },
) {
  const { owner, repo, number } = await params;
  if (!readRepositoryConfig()) return liveError("not_configured");
  if (!isConfiguredRepository(owner, repo)) return liveError("forbidden_repository");

  const pullNumber = Number(number);
  if (!/^\d{1,9}$/.test(number) || pullNumber <= 0) return liveError("invalid_request");

  try {
    return Response.json(await loadPullReview(owner, repo, pullNumber), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorFrom(error);
  }
}
