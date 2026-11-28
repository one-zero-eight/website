import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatixTitle } from "./CatixTitle";

vi.mock("./ask-session", () => ({ startNewChat: vi.fn() }));

describe("CatixTitle", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(createElement(CatixTitle)));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const button = () => container.querySelector("button")!;
  const point = (type: "pointerover" | "pointerout") =>
    act(() =>
      button().dispatchEvent(new PointerEvent(type, { bubbles: true })),
    );

  it("meows only after the pointer has stayed on the name", () => {
    point("pointerover");
    act(() => vi.advanceTimersByTime(1000));
    expect(button().textContent).toContain("catix");

    act(() => vi.advanceTimersByTime(600));
    expect(button().textContent).toContain("MEOW");
    expect(
      container.querySelector('img[src="/catix-cat-happy.svg"]'),
    ).not.toBeNull();
  });

  it("does not meow when the pointer leaves early, and goes back to the name after a meow", () => {
    point("pointerover");
    act(() => vi.advanceTimersByTime(1000));
    point("pointerout");
    act(() => vi.advanceTimersByTime(2000));
    expect(button().textContent).toContain("catix");

    point("pointerover");
    act(() => vi.advanceTimersByTime(1500));
    expect(button().textContent).toContain("MEOW");
    point("pointerout");
    expect(button().textContent).toContain("catix");
  });
});
