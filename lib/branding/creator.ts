/**
 * Creator identity for the product signature. Kept separate from the UI.
 *
 * Profile links come only from environment variables; a link is shown only
 * when its variable holds a valid http(s) URL, so nothing is guessed and no
 * placeholder links render.
 */

export type CreatorLinkKind = "github" | "linkedin" | "portfolio";

export interface CreatorLink {
  kind: CreatorLinkKind;
  label: string;
  href: string;
}

export interface Creator {
  name: string;
  role: string;
  /** One-line positioning; shown in the "Built by" section only. */
  description: string;
  /** Contact email, shown in the "Built by" section. */
  email: string;
  initials: string;
  /** Optional real profile image. When absent, initials are shown — never a stand-in photo. */
  avatarUrl: string | null;
  links: CreatorLink[];
}

const IDENTITY = {
  name: "Muhammad Shahrukh Khan",
  role: "AI Full Stack Engineer",
  description: "Building AI-powered developer tools and intelligent engineering workflows.",
  email: "muhammadshahrukhkhan87@gmail.com",
} as const;

const LINK_SOURCES: { kind: CreatorLinkKind; label: string; env: string }[] = [
  { kind: "github", label: "GitHub", env: "NEXT_PUBLIC_GITHUB_URL" },
  { kind: "linkedin", label: "LinkedIn", env: "NEXT_PUBLIC_LINKEDIN_URL" },
  { kind: "portfolio", label: "Portfolio", env: "NEXT_PUBLIC_PORTFOLIO_URL" },
];

/** Returns the URL if it's a well-formed http(s) URL, otherwise null. */
export function safeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 2 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** Server-side: reads links at request time. */
export function getCreator(env: NodeJS.ProcessEnv = process.env): Creator {
  const links = LINK_SOURCES.flatMap(({ kind, label, env: key }) => {
    const href = safeUrl(env[key]);
    return href ? [{ kind, label, href }] : [];
  });
  return {
    ...IDENTITY,
    initials: initialsOf(IDENTITY.name),
    avatarUrl: safeUrl(env.NEXT_PUBLIC_CREATOR_AVATAR_URL),
    links,
  };
}
