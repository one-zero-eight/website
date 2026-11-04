import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { setupI18n, type I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastContainer } from "./ToastContainer.tsx";
import { ToastProvider, useToast } from "./ToastContext.tsx";
import type { ToastContextType } from "./types.ts";

vi.mock("usehooks-ts", () => ({ useMediaQuery: () => false }));

function ToastHarness({
  onReady,
}: {
  onReady: (toast: ToastContextType) => void;
}) {
  const toast = useToast();
  useEffect(() => onReady(toast), [onReady, toast]);
  return createElement(ToastContainer);
}

describe("reactive toast localization", () => {
  let container: HTMLDivElement;
  let root: Root;
  let i18n: I18n;
  let toast: ToastContextType;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    i18n = setupI18n({
      locale: "en",
      messages: { en: enMessages, ru: ruMessages },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(
            ToastProvider,
            null,
            createElement(ToastHarness, {
              onReady: (value) => {
                toast = value;
              },
            }),
          ),
        ),
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("retranslates the same visible toast and confirmation on a locale switch", async () => {
    const title = msg`Success`;
    const message = msg`Error`;
    let confirmation: Promise<boolean>;
    await act(async () => {
      toast.showToast({ type: "success", title, message, duration: 0 });
      confirmation = toast.showConfirm({
        title: msg`Warning`,
        message: msg`Delete`,
      });
    });

    expect(toast.toasts[0].title).toBe(title);
    expect(toast.toasts[0].message).toBe(message);
    const notification = document.querySelector(".alert")!;
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(notification.textContent).toBe("SuccessError");
    expect(dialog.textContent).toContain("Warning");
    expect(dialog.textContent).toContain("Delete");
    expect(dialog.textContent).toContain("Cancel");
    expect(dialog.textContent).toContain("Confirm");

    await act(async () => i18n.activate("ru"));

    expect(document.querySelector(".alert")).toBe(notification);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(notification.textContent).toBe("УспехОшибка");
    expect(dialog.textContent).toContain("Предупреждение");
    expect(dialog.textContent).toContain("Удалить");
    expect(dialog.textContent).toContain("Отмена");
    expect(dialog.textContent).toContain("Подтвердить");
    expect(dialog.textContent).not.toContain("Confirm");

    const confirmButton = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent === "Подтвердить",
    )!;
    await act(async () => confirmButton.click());
    await expect(confirmation!).resolves.toBe(true);
  });

  it.each(["showSuccess", "showError", "showWarning", "showInfo"] as const)(
    "%s preserves descriptors until render",
    async (method) => {
      const title = msg`Success`;
      const message = msg`Error`;
      await act(async () => toast[method](title, message));
      const notification = document.querySelector(".alert")!;
      expect(toast.toasts[0].title).toBe(title);
      expect(toast.toasts[0].message).toBe(message);
      expect(notification.textContent).toBe("SuccessError");

      await act(async () => i18n.activate("ru"));

      expect(document.querySelector(".alert")).toBe(notification);
      expect(notification.textContent).toBe("УспехОшибка");
    },
  );

  it("retranslates custom confirmation button descriptors", async () => {
    let confirmation: Promise<boolean>;
    await act(async () => {
      confirmation = toast.showConfirm({
        title: msg`Warning`,
        message: msg`Error`,
        confirmText: msg`Delete`,
        cancelText: msg`Cancel`,
      });
    });
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Delete");
    expect(dialog.textContent).toContain("Cancel");

    await act(async () => i18n.activate("ru"));

    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(dialog.textContent).toContain("Удалить");
    expect(dialog.textContent).toContain("Отмена");
    const cancelButton = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent === "Отмена",
    )!;
    await act(async () => cancelButton.click());
    await expect(confirmation!).resolves.toBe(false);
  });

  it("preserves raw strings without looking them up in catalogs", async () => {
    await act(async () => {
      toast.showToast({
        type: "error",
        title: "Error",
        message: "API details",
        duration: 0,
      });
      void toast.showConfirm({
        title: "Warning",
        message: "API details",
        confirmText: "Delete",
        cancelText: "Cancel",
      });
    });
    const notification = document.querySelector(".alert")!;
    const dialog = document.querySelector('[role="dialog"]')!;

    await act(async () => i18n.activate("ru"));

    expect(notification.textContent).toBe("ErrorAPI details");
    expect(dialog.textContent).toContain("Warning");
    expect(dialog.textContent).toContain("API details");
    expect(dialog.textContent).toContain("Delete");
    expect(dialog.textContent).toContain("Cancel");
  });

  it("retranslates the visible close tooltip", async () => {
    await act(async () => {
      toast.showToast({ type: "info", title: msg`Success`, duration: 0 });
    });
    const closeButton =
      document.querySelector<HTMLButtonElement>(".alert button")!;
    expect(closeButton.type).toBe("button");
    await act(async () => closeButton.focus());
    const tooltip = document.querySelector('[role="tooltip"]')!;
    expect(tooltip.textContent).toBe("Close notification");

    await act(async () => i18n.activate("ru"));

    expect(document.querySelector('[role="tooltip"]')).toBe(tooltip);
    expect(tooltip.textContent).toBe("Закрыть уведомление");
  });
});
