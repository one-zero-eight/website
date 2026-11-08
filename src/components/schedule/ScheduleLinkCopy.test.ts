import { messages as enMessages } from "@/locales/en.po";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ScheduleLinkCopy from "./ScheduleLinkCopy";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("hides sensitive URLs from analytics and disables copying while revoking", async () => {
  await act(async () => {
    root.render(
      createElement(
        I18nProvider,
        { i18n: setupI18n({ locale: "en", messages: { en: enMessages } }) },
        createElement(ScheduleLinkCopy, {
          url: "https://search.example/export.ics?access_key=secret",
          copyButtonRef: null,
          sensitive: true,
          disabled: true,
        }),
      ),
    );
  });

  const input = container.querySelector("input")!;
  expect(input.className).toContain("ym-disable-keys");
  expect(input.parentElement?.className).toContain("ym-hide-content");
  expect(container.querySelector("button")?.disabled).toBe(true);
});
