import { i18n, type MessageDescriptor } from "@lingui/core";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimer } from "./useTimer";

const notifications = vi.hoisted(() => ({
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn<(message: MessageDescriptor) => void>(),
  showWarning: vi.fn<(message: MessageDescriptor) => void>(),
}));

vi.mock("@/components/toast", () => ({
  useToast: () => notifications,
}));

const maximumSeconds = 100 * 3600 - 1;
let timer: ReturnType<typeof useTimer>;

function TimerHarness() {
  const currentTimer = useTimer({
    title: "Boundary timer",
    setShowStopDialog: vi.fn(),
    setShowTimeUpMessage: vi.fn(),
  });
  useEffect(() => {
    timer = currentTimer;
  });
  return null;
}

describe("timer duration limit", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T09:00:00Z"));
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(createElement(TimerHarness)));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each([false, true])(
    "caps 99:30:00 plus 30 minutes at 99:59:59 (paused: %s)",
    async (paused) => {
      act(() => timer.handlers.setPresetTime(99, 30));
      await act(async () => timer.handlers.handleStart());
      if (paused) {
        act(() => timer.handlers.handlePause());
      }

      act(() => timer.handlers.addTimeToRunningTimer(30));

      expect(timer.state).toMatchObject({
        hours: "99",
        minutes: "59",
        seconds: "59",
        secondsLeft: maximumSeconds,
        initialSeconds: maximumSeconds,
        targetEndTime: paused ? null : Date.now() + maximumSeconds * 1000,
      });
      expect(i18n._(notifications.showWarning.mock.lastCall![0])).toBe(
        "Timer set to maximum (99:59:59)",
      );
      expect(JSON.parse(localStorage.getItem("timerState")!)).toMatchObject({
        initialSeconds: maximumSeconds,
        isRunning: true,
        isPaused: paused,
        ...(paused
          ? { pausedSecondsLeft: maximumSeconds }
          : { targetEndTime: Date.now() + maximumSeconds * 1000 }),
      });
    },
  );

  it("adds only the remaining capacity to a running timer's deadline", async () => {
    act(() => timer.handlers.setPresetTime(99, 59));
    await act(async () => timer.handlers.handleStart());
    const originalEndTime = timer.state.targetEndTime!;
    const originalInitialSeconds = timer.state.initialSeconds;
    vi.setSystemTime(Date.now() + 2000);

    act(() => timer.handlers.addTimeToRunningTimer(5));

    expect(timer.state.secondsLeft).toBe(maximumSeconds);
    expect(timer.state.targetEndTime).toBe(Date.now() + maximumSeconds * 1000);
    expect(timer.state.targetEndTime).toBe(originalEndTime + 61_000);
    expect(timer.state.initialSeconds).toBe(originalInitialSeconds + 61);
    expect(JSON.parse(localStorage.getItem("timerState")!)).toMatchObject({
      targetEndTime: timer.state.targetEndTime,
      initialSeconds: timer.state.initialSeconds,
    });
  });

  it("keeps a paused timer unchanged when it is already at maximum", async () => {
    await act(async () =>
      timer.handlers.handleStartUntilTime(
        new Date(Date.now() + maximumSeconds * 1000),
      ),
    );
    act(() => timer.handlers.handlePause());
    const savedState = localStorage.getItem("timerState");
    const previousState = timer.state;

    act(() => timer.handlers.addTimeToRunningTimer(5));

    expect(timer.state).toEqual(previousState);
    expect(localStorage.getItem("timerState")).toBe(savedState);
    expect(i18n._(notifications.showWarning.mock.lastCall![0])).toBe(
      "Timer is already at maximum (99:59:59)",
    );
  });

  it("rejects a target date one second beyond 99:59:59", async () => {
    await act(async () =>
      timer.handlers.handleStartUntilTime(
        new Date(Date.now() + (maximumSeconds + 1) * 1000),
      ),
    );

    expect(timer.state.isRunning).toBe(false);
    expect(timer.state.secondsLeft).toBe(0);
    expect(timer.state.targetEndTime).toBeNull();
    expect(i18n._(notifications.showError.mock.lastCall![0])).toBe(
      "The maximum countdown duration is 99:59:59",
    );
  });

  it("starts a timer for a target date exactly 99:59:59 away", async () => {
    const targetDate = new Date(Date.now() + maximumSeconds * 1000);

    await act(async () => timer.handlers.handleStartUntilTime(targetDate));

    expect(timer.state).toMatchObject({
      isRunning: true,
      hours: "99",
      minutes: "59",
      seconds: "59",
      secondsLeft: maximumSeconds,
      initialSeconds: maximumSeconds,
      targetEndTime: targetDate.getTime(),
    });
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it("never formats three-digit hours", () => {
    act(() => timer.utils.formatTime(100 * 3600));

    expect(timer.state).toMatchObject({
      hours: "99",
      minutes: "59",
      seconds: "59",
    });
  });
});
