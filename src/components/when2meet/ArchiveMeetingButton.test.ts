import type { when2meetTypes } from "@/api/when2meet";
import { ToastItem, ToastProvider, useToast } from "@/components/toast";
import { setupI18n, type I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveMeetingButton } from "./ArchiveMeetingButton.tsx";

const mutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  onSuccess: vi.fn<(meeting: when2meetTypes.SchemaEventView) => void>(),
  onError: vi.fn<(error: Error) => void>(),
}));

vi.mock("@/api/when2meet", () => ({
  $when2meet: {
    useMutation: (
      _method: string,
      _path: string,
      options: Pick<typeof mutation, "onSuccess" | "onError">,
    ) => {
      mutation.onSuccess = options.onSuccess;
      mutation.onError = options.onError;
      return { mutate: mutation.mutate, isPending: false };
    },
  },
}));

function Notifications() {
  const { toasts, hideToast } = useToast();
  return toasts.map((toast) =>
    createElement(ToastItem, { key: toast.id, toast, onClose: hideToast }),
  );
}

const meetingName = "Planning";
const message = "Failed to fetch";
const descriptors = {
  title: msg`Archive meeting`,
  message: msg`Archive "${meetingName}"? Participants will still be able to view it, but changes will no longer be allowed.`,
  confirm: msg`Archive`,
  cancel: msg`Cancel`,
  success: msg`Meeting archived`,
  archived: msg`"${meetingName}" was moved to the archive.`,
  error: msg`Error`,
  networkError: msg`Network error: ${message}`,
};

const russianMessages = {
  [descriptors.title.id!]: "Архивировать встречу",
  [descriptors.message.id!]:
    "Архивировать «{meetingName}»? Изменения будут запрещены.",
  [descriptors.confirm.id!]: "Архивировать",
  [descriptors.cancel.id!]: "Отмена",
  [descriptors.success.id!]: "Встреча архивирована",
  [descriptors.archived.id!]: "«{meetingName}» перемещена в архив.",
  [descriptors.error.id!]: "Ошибка",
  [descriptors.networkError.id!]: "Ошибка сети: {message}",
};

describe("ArchiveMeetingButton localization", () => {
  let root: Root;
  let container: HTMLDivElement;
  let i18n: I18n;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    i18n = setupI18n({
      locale: "en",
      messages: { en: {}, ru: russianMessages },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(
            ToastProvider,
            null,
            createElement(ArchiveMeetingButton, {
              meetingRef: "planning",
              meetingName,
              disabled: false,
              onMeetingUpdated: vi.fn(),
            }),
            createElement(Notifications),
          ),
        ),
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("updates an open confirmation and its success toast after switching locale", async () => {
    await act(async () => container.querySelector("button")!.click());
    expect(document.body.textContent).toContain('Archive "Planning"?');

    act(() => i18n.activate("ru"));
    expect(document.body.textContent).toContain("Архивировать встречу");
    expect(document.body.textContent).toContain("Архивировать «Planning»?");
    const buttons = Array.from(document.body.querySelectorAll("button"));
    expect(buttons.some((button) => button.textContent === "Отмена")).toBe(
      true,
    );

    await act(async () => {
      buttons.find((button) => button.textContent === "Архивировать")!.click();
    });
    expect(mutation.mutate).toHaveBeenCalledWith({
      params: { path: { meeting_ref: "planning" } },
    });

    act(() => mutation.onSuccess({} as when2meetTypes.SchemaEventView));
    expect(document.body.textContent).toContain("Встреча архивирована");
    expect(document.body.textContent).toContain(
      "«Planning» перемещена в архив.",
    );

    act(() => i18n.activate("en"));
    expect(document.body.textContent).toContain("Meeting archived");
    expect(document.body.textContent).toContain(
      '"Planning" was moved to the archive.',
    );
  });

  it("updates an existing network error prefix after switching locale", () => {
    act(() => mutation.onError(new TypeError(message)));
    expect(document.body.textContent).toContain(
      "Network error: Failed to fetch",
    );

    act(() => i18n.activate("ru"));
    expect(document.body.textContent).toContain("Ошибка сети: Failed to fetch");
    expect(document.body.textContent).not.toContain("Network error:");
  });

  it("updates an existing error title without translating the backend message", () => {
    act(() => mutation.onError(new Error("Backend rejected the archive")));
    expect(document.body.textContent).toContain("Error");

    act(() => i18n.activate("ru"));
    expect(document.body.textContent).toContain("Ошибка");
    expect(document.body.textContent).toContain("Backend rejected the archive");
  });
});
