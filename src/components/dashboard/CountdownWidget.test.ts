import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CountdownWidget } from "./CountdownWidget.tsx";

const state = vi.hoisted(() => ({ nowMs: Date.parse("2026-06-15T09:00:00Z") }));
vi.mock("@/lib/utils/use-now.ts", () => ({ useNowMS: () => state.nowMs }));

describe("restored CountdownWidget", () => {
  it("shows the next annual event rather than an expired dated event", () => {
    state.nowMs = Date.parse("2026-06-15T09:00:00Z");
    const html = renderToStaticMarkup(createElement(CountdownWidget));
    expect(html).toContain("New Year countdown");
    expect(html).not.toContain("Introduction to");
    expect(html).toContain("days");
  });
  it("handles year rollover and pluralizes a final second", () => {
    state.nowMs = Date.parse("2026-12-31T23:59:59+03:00");
    expect(renderToStaticMarkup(createElement(CountdownWidget))).toContain(
      "0 days, 0 hours, 0 minutes, 1 second",
    );
    state.nowMs += 1000;
    const html = renderToStaticMarkup(createElement(CountdownWidget));
    expect(html).toContain("Summer countdown");
    expect(html).toContain("151 days, 0 hours, 0 minutes, 0 seconds");
  });
});
