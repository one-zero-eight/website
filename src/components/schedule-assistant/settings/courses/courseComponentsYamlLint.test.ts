import { describe, expect, it } from "vitest";
import { validateCourseComponentsYaml } from "./courseComponentsYamlLint.ts";

function yamlForActive(active: unknown) {
  return JSON.stringify([{ tag: "lec", sessions: [{ audience: [], active }] }]);
}

describe("course component series periods in YAML", () => {
  it("accepts unlimited and explicit inclusive periods", () => {
    expect(validateCourseComponentsYaml(yamlForActive(null)).ok).toBe(true);
    expect(
      validateCourseComponentsYaml(
        yamlForActive({ start_date: "2026-09-01", end_date: "2026-09-01" }),
      ).ok,
    ).toBe(true);
    expect(
      validateCourseComponentsYaml(yamlForActive({ block: "first" })).ok,
    ).toBe(true);
  });

  it.each([
    { start_date: "2026-09-31", end_date: "2026-10-01" },
    { start_date: "2026-09-15", end_date: "2026-09-01" },
    { start_date: "", end_date: "2026-09-01" },
    { start_date: "2026-09-01" },
    { start_date: { block: "first" }, end_date: "2026-09-01" },
    { block: "first", start_date: "2026-09-01", end_date: "2026-09-01" },
    { block: "" },
  ])("rejects malformed or reversed dates: %s", (active) => {
    expect(validateCourseComponentsYaml(yamlForActive(active)).ok).toBe(false);
  });
});
