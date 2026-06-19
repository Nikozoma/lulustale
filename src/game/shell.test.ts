import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("game shell mobile-first UI", () => {
  it("does not expose the old Interact button or floating interaction prompt shell", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).not.toContain("interact-button");
    expect(html).not.toContain("interaction-prompt");
    expect(html).not.toContain(">Interact</button>");
  });
});
