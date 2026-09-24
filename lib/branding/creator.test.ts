import { describe, expect, it } from "vitest";
import { getCreator, initialsOf, safeUrl } from "./creator";

const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

describe("creator branding", () => {
  it("shows no links when nothing is configured", () => {
    const creator = getCreator(env({}));
    expect(creator.name).toBe("Muhammad Shahrukh Khan");
    expect(creator.role).toBe("AI Full Stack Engineer");
    expect(creator.email).toBe("muhammadshahrukhkhan87@gmail.com");
    expect(creator.links).toEqual([]);
    expect(creator.avatarUrl).toBeNull();
  });

  it("only includes configured, valid http(s) links, in a stable order", () => {
    const creator = getCreator(
      env({
        NEXT_PUBLIC_LINKEDIN_URL: " https://www.linkedin.com/in/someone/ ",
        NEXT_PUBLIC_GITHUB_URL: "https://github.com/someone",
        NEXT_PUBLIC_PORTFOLIO_URL: "javascript:alert(1)",
      }),
    );
    expect(creator.links.map((link) => link.kind)).toEqual(["github", "linkedin"]);
    expect(creator.links[1].href).toBe("https://www.linkedin.com/in/someone/");
  });

  it("rejects malformed and non-web URLs", () => {
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl("ftp://example.com")).toBeNull();
    expect(safeUrl("")).toBeNull();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("derives initials from first and last name", () => {
    expect(initialsOf("Muhammad Shahrukh Khan")).toBe("MK");
    expect(initialsOf("Ada Lovelace")).toBe("AL");
  });
});
