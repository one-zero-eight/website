import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import type { ToastText } from "@/components/toast";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SportTrainerBaamImportButton } from "./SportTrainerBaamImportButton";

const mocks = vi.hoisted(() => ({
  fetchQuery: vi.fn(),
  markAttendance: vi.fn(),
  showError: vi.fn<(title: ToastText, message?: ToastText) => void>(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  invalidateAttendance: vi.fn(),
}));

vi.mock("@/api/sport", () => ({
  $sport: {
    useMutation: () => ({ mutateAsync: mocks.markAttendance }),
    queryOptions: vi.fn(),
  },
}));

vi.mock("@/app/query-client.ts", () => ({
  queryClient: { fetchQuery: mocks.fetchQuery },
}));

vi.mock("@/components/sport/sport-trainer-utils.ts", () => ({
  invalidateAttendance: mocks.invalidateAttendance,
  sportTrainerMenuBtn: "btn",
}));

vi.mock("@/components/toast", () => ({
  useToast: () => ({
    showError: mocks.showError,
    showSuccess: mocks.showSuccess,
    showWarning: mocks.showWarning,
  }),
}));

describe("BAAM import error localization", () => {
  let root: Root;
  let container: HTMLDivElement;
  let previousLocale: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    previousLocale = i18n.locale;
    i18n.load("en", {});
    i18n.activate("en");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(SportTrainerBaamImportButton, {
            trainingId: 1,
            groupId: 2,
            maxHours: 2,
          }),
        ),
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    i18n.activate(previousLocale);
    vi.unstubAllGlobals();
  });

  it("keeps one aggregate toast reactive without translating backend descriptions", async () => {
    const networkError = new TypeError("Failed to fetch");
    const backendDescription = "Attendance is already marked";
    mocks.fetchQuery
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce([{ id: 3, email: "second@innopolis.university" }]);
    mocks.markAttendance.mockResolvedValue({ description: backendDescription });

    const input = container.querySelector("input")!;
    Object.defineProperty(input, "files", {
      value: [
        {
          text: async () =>
            "first@innopolis.university\nsecond@innopolis.university",
        },
      ],
    });

    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(mocks.showError).toHaveBeenCalledTimes(1);
    const [, message] = mocks.showError.mock.calls[0];
    if (!message || typeof message === "string") {
      throw new Error("Expected a reactive message descriptor");
    }
    const networkDescriptor = formatApiErrorDescriptor(networkError);
    if (typeof networkDescriptor === "string") {
      throw new Error("Expected a network error descriptor");
    }

    expect(i18n._(message)).toBe(
      `Failed: first@innopolis.university (Network error: Failed to fetch), second@innopolis.university (${backendDescription})`,
    );
    act(() => {
      i18n.load("ru", {
        [message.id]: "Не удалось: {failed}",
        [networkDescriptor.id]: "Ошибка сети: {message}",
      });
      i18n.activate("ru");
    });
    expect(i18n._(message)).toBe(
      `Не удалось: first@innopolis.university (Ошибка сети: Failed to fetch), second@innopolis.university (${backendDescription})`,
    );
    act(() => i18n.activate("en"));
    expect(i18n._(message)).toContain("Network error: Failed to fetch");
    expect(mocks.showError).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateAttendance).toHaveBeenCalledWith(1);
  });
});
