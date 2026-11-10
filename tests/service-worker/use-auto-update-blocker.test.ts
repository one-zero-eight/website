import { useAutoUpdateBlocker } from "@/app/use-auto-update-blocker.ts";
import type { ShouldBlockFn, UseBlockerOpts } from "@tanstack/react-router";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";

type BlockerOptions = NonNullable<
  Parameters<typeof useAutoUpdateBlocker<boolean>>[1]
>;
const navigation = {
  current: {
    routeId: "/_with_menu/about",
    fullPath: "/about",
    pathname: "/about",
    params: {},
    search: {},
  },
  next: {
    routeId: "/_with_menu/debug",
    fullPath: "/debug",
    pathname: "/debug",
    params: {},
    search: {},
  },
  action: "PUSH",
} satisfies Parameters<ShouldBlockFn>[0];

const { useBlockerMock } = vi.hoisted(() => ({
  useBlockerMock: vi.fn<(options: UseBlockerOpts) => unknown>(),
}));
vi.mock("@tanstack/react-router", () => ({ useBlocker: useBlockerMock }));

let container: HTMLDivElement;
let root: Root;

function BlockerProbe({
  enabled,
  options,
}: {
  enabled?: boolean;
  options?: BlockerOptions;
}) {
  useAutoUpdateBlocker(enabled, options);
  return null;
}

function ResolverProbe({ onResult }: { onResult: (result: unknown) => void }) {
  const resolver = useAutoUpdateBlocker(true, {
    withResolver: true,
    shouldBlockFn: () => true,
  });
  expectTypeOf(resolver).toHaveProperty("status");
  expectTypeOf(resolver).toHaveProperty("proceed");
  useEffect(() => onResult(resolver), [onResult, resolver]);
  return null;
}

async function renderBlocker(enabled?: boolean, options?: BlockerOptions) {
  await act(async () =>
    root.render(createElement(BlockerProbe, { enabled, options })),
  );
}

beforeEach(() => {
  useBlockerMock.mockReset();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useAutoUpdateBlocker", () => {
  it.each([
    { enabled: undefined, disabled: false },
    { enabled: true, disabled: false },
    { enabled: false, disabled: true },
  ])(
    "maps enabled=$enabled to disabled=$disabled with auto-update-only defaults",
    async ({ enabled, disabled }) => {
      await renderBlocker(enabled);
      expect(useBlockerMock).toHaveBeenLastCalledWith({
        disabled,
        enableBeforeUnload: false,
        shouldBlockFn: expect.any(Function),
        withResolver: undefined,
      });
      expect(useBlockerMock.mock.lastCall![0].shouldBlockFn(navigation)).toBe(
        false,
      );
    },
  );

  it("keeps its default navigation predicate stable across re-renders and enable/disable changes", async () => {
    await renderBlocker(true);
    const predicate = useBlockerMock.mock.lastCall![0].shouldBlockFn;
    await renderBlocker(true);
    await renderBlocker(false);
    await renderBlocker(true);
    expect(
      useBlockerMock.mock.calls.map(([options]) => options.disabled),
    ).toEqual([false, false, true, false]);
    for (const [options] of useBlockerMock.mock.calls) {
      expect(options.shouldBlockFn).toBe(predicate);
      expect(options.enableBeforeUnload).toBe(false);
    }
  });

  it("forwards an async navigation guard and unload protection without invoking the guard", async () => {
    const shouldBlockFn = vi.fn<ShouldBlockFn>().mockResolvedValue(true);
    await renderBlocker(true, { shouldBlockFn, enableBeforeUnload: true });
    const forwarded = useBlockerMock.mock.lastCall![0];
    expect(forwarded.shouldBlockFn).toBe(shouldBlockFn);
    expect(forwarded.enableBeforeUnload).toBe(true);
    expect(shouldBlockFn).not.toHaveBeenCalled();
    await expect(forwarded.shouldBlockFn(navigation)).resolves.toBe(true);
    expect(shouldBlockFn).toHaveBeenCalledExactlyOnceWith(navigation);
  });

  it("only shows a confirmation when the forwarded navigation guard is invoked", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderBlocker(true, {
      shouldBlockFn: () => !window.confirm("Discard unsaved changes?"),
      enableBeforeUnload: true,
    });
    expect(confirm).not.toHaveBeenCalled();
    const guard = useBlockerMock.mock.lastCall![0].shouldBlockFn;
    expect(guard(navigation)).toBe(true);
    confirm.mockReturnValue(true);
    expect(guard(navigation)).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("preserves a lazy before-unload condition", async () => {
    const enableBeforeUnload = vi.fn(() => true);
    await renderBlocker(true, { enableBeforeUnload });
    expect(useBlockerMock.mock.lastCall![0].enableBeforeUnload).toBe(
      enableBeforeUnload,
    );
    expect(enableBeforeUnload).not.toHaveBeenCalled();
  });

  it("keeps enabled=false authoritative when navigation and unload guards are supplied", async () => {
    const shouldBlockFn = vi.fn<ShouldBlockFn>(() => true);
    await renderBlocker(false, { shouldBlockFn, enableBeforeUnload: true });
    expect(useBlockerMock.mock.lastCall![0].disabled).toBe(true);
    expect(shouldBlockFn).not.toHaveBeenCalled();
  });

  it("forwards withResolver and returns the native resolver with its inferred type", async () => {
    const resolver = {
      status: "blocked",
      ...navigation,
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    useBlockerMock.mockReturnValue(resolver);
    const onResult = vi.fn();
    await act(async () =>
      root.render(createElement(ResolverProbe, { onResult })),
    );
    expect(useBlockerMock.mock.lastCall![0].withResolver).toBe(true);
    expect(onResult).toHaveBeenCalledExactlyOnceWith(resolver);
    expectTypeOf<
      ReturnType<typeof useAutoUpdateBlocker<false>>
    >().toEqualTypeOf<void>();
  });
});
