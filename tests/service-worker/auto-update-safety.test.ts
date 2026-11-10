import {
  getAutoUpdateBlockReason,
  hasAutoReloadBlocker,
  isNewerAppBuild,
  registerAutoReloadBlocker,
} from "@/app/auto-update-safety.ts";
import type { BuildInfo } from "@/service-worker/protocol.ts";
import { describe, expect, it } from "vitest";

const idlePage = {
  online: true,
  navigationIdle: true,
  hasPendingMutations: false,
  hasComponentBlocker: false,
  alreadyAttempted: false,
};
const current: BuildInfo = {
  version: "1.7.0",
  buildId: "current-build",
  resourcesBuildHash: "current-resources",
  commitHash: "current-commit",
  builtAt: "2026-11-10T10:00:00.000Z",
};

describe("default-on automatic update policy", () => {
  it("allows updates without route, visibility or DOM-interaction heuristics", () => {
    expect(getAutoUpdateBlockReason(idlePage)).toBeNull();
  });

  it.each([
    ["online", false, "offline"],
    ["navigationIdle", false, "navigation"],
    ["hasPendingMutations", true, "mutation"],
    ["hasComponentBlocker", true, "component-blocker"],
    ["alreadyAttempted", true, "already-attempted"],
  ] as const)("blocks while %s is %s", (key, value, reason) => {
    expect(getAutoUpdateBlockReason({ ...idlePage, [key]: value })).toBe(
      reason,
    );
  });

  it("requires every component blocker to be removed before allowing updates", () => {
    const removeFirst = registerAutoReloadBlocker();
    const removeSecond = registerAutoReloadBlocker();
    try {
      expect(hasAutoReloadBlocker()).toBe(true);
      removeFirst();
      expect(hasAutoReloadBlocker()).toBe(true);
      removeSecond();
      expect(hasAutoReloadBlocker()).toBe(false);
    } finally {
      removeFirst();
      removeSecond();
    }
  });

  it("only accepts newer app builds, not an older offline fallback or the same build", () => {
    expect(
      isNewerAppBuild(
        {
          ...current,
          buildId: "new-build",
          builtAt: "2026-11-10T10:01:00.000Z",
        },
        current,
      ),
    ).toBe(true);
    expect(
      isNewerAppBuild(
        {
          ...current,
          buildId: "older-build",
          builtAt: "2026-11-10T09:59:00.000Z",
        },
        current,
      ),
    ).toBe(false);
    expect(isNewerAppBuild(current, current)).toBe(false);
    expect(
      isNewerAppBuild(
        { ...current, buildId: "same-time-unknown-order" },
        current,
      ),
    ).toBe(false);
  });
});
