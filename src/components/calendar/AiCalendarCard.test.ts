import { messages as enMessages } from "@/locales/en.po";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AiCalendarCard } from "./AiCalendarCard";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));
vi.mock("@/components/schedule/HideButtonUI.tsx", () => ({
  default: () => null,
}));
vi.mock("@/components/schedule/group-card/LinkIconButton.tsx", () => ({
  default: () => null,
}));
vi.mock("./ai-calendar", () => ({
  useAiCalendarHidden: () => [false, vi.fn()],
}));

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
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("opens export without navigating to the assistant", async () => {
  const onExport = vi.fn();
  await act(async () => {
    root.render(
      createElement(
        I18nProvider,
        { i18n: setupI18n({ locale: "en", messages: { en: enMessages } }) },
        createElement(AiCalendarCard, { exportButtonOnClick: onExport }),
      ),
    );
  });

  const exportButton = container.querySelector("button");
  expect(exportButton).not.toBeNull();
  await act(async () => exportButton!.click());

  expect(onExport).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
});
