import { describe, expect, it } from "vitest";
import { describeFile, parseFileList } from "./files";

describe("describeFile", () => {
  it("splits directory, name and extension", () => {
    expect(describeFile("src/auth/token.ts")).toMatchObject({
      directory: "src/auth/",
      name: "token.ts",
      extension: "ts",
      kind: "code",
    });
  });

  it("detects tests by directory or suffix", () => {
    expect(describeFile("tests/auth/token.test.ts").kind).toBe("test");
    expect(describeFile("src/button.spec.tsx").kind).toBe("test");
  });

  it("classifies common non-code files", () => {
    expect(describeFile("README.md").kind).toBe("doc");
    expect(describeFile("db/migrations/001.sql").kind).toBe("data");
    expect(describeFile("Dockerfile").kind).toBe("config");
  });
});

describe("parseFileList", () => {
  it("splits pasted lists and removes duplicates and bullets", () => {
    expect(parseFileList("a.ts\n- b.ts\r\n\n a.ts , c.ts")).toEqual(["a.ts", "b.ts", "c.ts"]);
  });
});
