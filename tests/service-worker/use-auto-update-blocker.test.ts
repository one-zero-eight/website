import {
  blockersChangedEvent,
  hasAutoUpdateBlocker,
  useAutoUpdateBlocker,
} from "@/app/auto-update.ts";
import { act, createElement, Fragment, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let container: HTMLDivElement;
let root: Root;

function BlockerProbe({ enabled }: { enabled?: boolean }) {
  useAutoUpdateBlocker(enabled);
  return null;
}

async function renderBlocker(enabled?: boolean) {
  await act(async () => root.render(createElement(BlockerProbe, { enabled })));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  expect(hasAutoUpdateBlocker()).toBe(false);
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useAutoUpdateBlocker", () => {
  it.each([undefined, true, false])(
    "registers enabled=%s without a RouterProvider",
    async (enabled) => {
      await renderBlocker(enabled);
      expect(hasAutoUpdateBlocker()).toBe(enabled !== false);
    },
  );

  it("changes registration only when enabled changes, not on every render", async () => {
    const handleSafetyChanged = vi.fn();
    window.addEventListener(blockersChangedEvent, handleSafetyChanged);
    try {
      await renderBlocker(true);
      await renderBlocker(true);
      expect(hasAutoUpdateBlocker()).toBe(true);
      expect(handleSafetyChanged).toHaveBeenCalledTimes(1);
      await renderBlocker(false);
      expect(hasAutoUpdateBlocker()).toBe(false);
      expect(handleSafetyChanged).toHaveBeenCalledTimes(2);
      await renderBlocker(true);
      expect(hasAutoUpdateBlocker()).toBe(true);
      expect(handleSafetyChanged).toHaveBeenCalledTimes(3);
    } finally {
      window.removeEventListener(blockersChangedEvent, handleSafetyChanged);
    }
  });

  it("releases its registration when the component unmounts", async () => {
    await renderBlocker(true);
    expect(hasAutoUpdateBlocker()).toBe(true);
    await act(async () => root.render(null));
    expect(hasAutoUpdateBlocker()).toBe(false);
  });

  it("retains other components' registrations when one blocker is disabled", async () => {
    async function renderPair(first: boolean, second: boolean) {
      await act(async () =>
        root.render(
          createElement(
            Fragment,
            null,
            createElement(BlockerProbe, { key: "first", enabled: first }),
            createElement(BlockerProbe, { key: "second", enabled: second }),
          ),
        ),
      );
    }
    await renderPair(true, true);
    expect(hasAutoUpdateBlocker()).toBe(true);
    await renderPair(false, true);
    expect(hasAutoUpdateBlocker()).toBe(true);
    await renderPair(false, false);
    expect(hasAutoUpdateBlocker()).toBe(false);
  });

  it("cleans up StrictMode's setup/cleanup cycle without leaking registrations", async () => {
    const states: boolean[] = [];
    function handleSafetyChanged() {
      states.push(hasAutoUpdateBlocker());
    }
    window.addEventListener(blockersChangedEvent, handleSafetyChanged);
    try {
      await act(async () =>
        root.render(
          createElement(StrictMode, null, createElement(BlockerProbe)),
        ),
      );
      expect(hasAutoUpdateBlocker()).toBe(true);
      await act(async () => root.render(null));
      expect(hasAutoUpdateBlocker()).toBe(false);
      expect(states).toEqual([true, false, true, false]);
    } finally {
      window.removeEventListener(blockersChangedEvent, handleSafetyChanged);
    }
  });
});
