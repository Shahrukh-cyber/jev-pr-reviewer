import { isConfiguredRepository, liveError, liveErrorFrom, loadPullList, readRepositoryConfig } from "@/lib/reviews/server";

/** GET /api/reviews/:owner/:repo — recent PRs of the configured repository with their review status. */
export async function GET(_request: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  if (!readRepositoryConfig()) return liveError("not_configured");
  if (!isConfiguredRepository(owner, repo)) return liveError("forbidden_repository");

  try {
    return Response.json(await loadPullList(owner, repo), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorFrom(error);
  }
}
