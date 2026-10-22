import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { i18n, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import moment from "moment";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateLocale, LOCALE_STORAGE_KEY, useAppLocale } from "./lib";

function LocaleControls() {
  const [locale, setLocale] = useAppLocale();
  const { t } = useLingui();

  return createElement(
    "button",
    {
      type: "button",
      title: t`Switch language`,
      onClick: () => setLocale(locale === "en" ? "ru" : "en"),
    },
    moment("2026-10-20").format("MMMM"),
  );
}

function TranslatedLabel() {
  const { t } = useLingui();
  return createElement("span", null, t`Switch language`);
}

describe("application locale switching", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify("en"));
    activateLocale("en");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    activateLocale("en");
    vi.unstubAllGlobals();
  });

  it("uses the provider's locale independently of the global i18n instance", () => {
    const providerI18n = setupI18n({
      locale: "ru",
      messages: { en: enMessages, ru: ruMessages },
    });

    act(() => {
      root.render(
        createElement(
          I18nProvider,
          { i18n: providerI18n },
          createElement(TranslatedLabel),
        ),
      );
    });

    expect(i18n.locale).toBe("en");
    expect(container.textContent).toBe("Сменить язык");

    act(() => providerI18n.activate("en"));

    expect(container.textContent).toBe("Switch language");
  });

  it("updates visible messages, Moment dates, document language and persistence without remounting", () => {
    act(() => {
      root.render(
        createElement(I18nProvider, { i18n }, createElement(LocaleControls)),
      );
    });

    const button = container.querySelector("button")!;
    expect(button.title).toBe("Switch language");
    expect(button.textContent).toBe("October");

    act(() => button.click());

    expect(container.querySelector("button")).toBe(button);
    expect(button.title).toBe("Сменить язык");
    expect(button.textContent).toBe("октябрь");
    expect(document.documentElement.lang).toBe("ru");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(JSON.stringify("ru"));

    act(() => button.click());

    expect(button.title).toBe("Switch language");
    expect(button.textContent).toBe("October");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(JSON.stringify("en"));
  });
});
