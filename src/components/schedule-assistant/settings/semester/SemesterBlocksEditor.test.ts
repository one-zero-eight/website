import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SemesterBlocksEditor } from "./SemesterBlocksEditor.tsx";
import { splitSemesterInTwo } from "./semesterBlocks.ts";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
const i18n = setupI18n({ locale: "en", messages: {} });

const mocks = vi.hoisted(() => ({
  config: {
    term: {
      semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
      blocks: [] as {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
      }[],
    },
    courses: [] as {
      name: string;
      components: { tag: string; sessions: { block_id: string | null }[] }[];
    }[],
  },
  updateTerm: vi.fn(),
  setFieldDirty: vi.fn(),
  isError: false,
}));
vi.mock("@/components/schedule-assistant/config/useConfig.tsx", () => ({
  useConfig: () => ({ config: mocks.config, isPending: false, isError: false }),
  useUpdateTermMutation: () => ({
    mutate: mocks.updateTerm,
    isPending: false,
    isError: mocks.isError,
    error: new Error("Backend refused blocks"),
    reset: vi.fn(),
  }),
}));
vi.mock(
  "@/components/schedule-assistant/settings/settingsSaveStatus.tsx",
  () => ({
    useSettingsSaveStatusContext: () => ({
      setFieldDirty: mocks.setFieldDirty,
    }),
  }),
);
vi.mock("@/components/schedule-assistant/DateInput.tsx", () => ({
  DateInput: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) =>
    createElement("input", {
      "data-date-input": true,
      value,
      onChange: (event: { target: { value: string } }) =>
        onChange(event.target.value),
    }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(SemesterBlocksEditor),
      ),
    ),
  );
  return {
    container,
    click: async (text: string) =>
      act(async () => {
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent?.trim() === text)!
          .click();
      }),
    rerender: async () =>
      act(async () =>
        root.render(
          createElement(
            I18nProvider,
            { i18n },
            createElement(SemesterBlocksEditor),
          ),
        ),
      ),
    changeDate: async (index: number, value: string) =>
      act(async () => {
        const input = container.querySelectorAll<HTMLInputElement>(
          "input[data-date-input]",
        )[index];
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }),
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

beforeEach(() => {
  mocks.config.term.blocks = [];
  mocks.config.courses = [];
  mocks.isError = false;
  mocks.updateTerm.mockClear();
  mocks.setFieldDirty.mockClear();
});

describe("SemesterBlocksEditor", () => {
  it("keeps added blocks local until explicit save and submits ordered blocks", async () => {
    const editor = await mount();
    await editor.click("Добавить блок");
    expect(mocks.updateTerm).not.toHaveBeenCalled();
    expect(
      editor.container.querySelectorAll("input[data-date-input]"),
    ).toHaveLength(2);
    expect(editor.container.textContent).not.toContain(
      "Разделить семестр пополам",
    );
    expect(editor.container.textContent).not.toContain(
      "Нет свободных дат для нового блока",
    );
    await editor.click("Сохранить блоки");
    expect(mocks.updateTerm.mock.calls[0][0].body.blocks).toEqual([
      expect.objectContaining({
        name: "Блок 1",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
      }),
    ]);
    await editor.cleanup();
  });

  it("blocks deleting a referenced course block with a clear message", async () => {
    mocks.config.term.blocks = splitSemesterInTwo(mocks.config.term.semester);
    mocks.config.courses = [
      {
        name: "Algorithms",
        components: [{ tag: "lec", sessions: [{ block_id: "block-1" }] }],
      },
    ];
    const editor = await mount();
    await editor.click("Удалить");
    expect(editor.container.textContent).toContain(
      "Cannot delete a block referenced by series",
    );
    expect(editor.container.textContent).toContain("Algorithms");
    expect(
      editor.container.querySelectorAll("input[data-date-input]"),
    ).toHaveLength(4);
    expect(mocks.updateTerm).not.toHaveBeenCalled();
    await editor.cleanup();
  });

  it("rejects overlapping bounds and preserves drafts after a failed save", async () => {
    mocks.config.term.blocks = splitSemesterInTwo(mocks.config.term.semester);
    const editor = await mount();
    await editor.changeDate(1, "2026-09-16");
    expect(editor.container.textContent).toContain(
      "блоки не должны пересекаться",
    );
    await editor.click("Сохранить блоки");
    expect(mocks.updateTerm).not.toHaveBeenCalled();
    await editor.changeDate(1, "2026-09-14");
    await editor.click("Сохранить блоки");
    expect(mocks.updateTerm).toHaveBeenCalledTimes(1);
    expect(mocks.updateTerm.mock.calls[0][0].body.blocks[0].end_date).toBe(
      "2026-09-14",
    );
    mocks.isError = true;
    await editor.rerender();
    expect(
      editor.container.querySelectorAll("input[data-date-input]"),
    ).toHaveLength(4);
    expect(editor.container.textContent).toContain("Ошибка сохранения блоков");
    expect(mocks.setFieldDirty).toHaveBeenCalledWith(expect.any(String), true);
    await editor.cleanup();
  });

  it("shows mutation errors explicitly", async () => {
    mocks.isError = true;
    const editor = await mount();
    expect(editor.container.textContent).toContain("Ошибка сохранения блоков");
    expect(editor.container.textContent).toContain("Backend refused blocks");
    await editor.cleanup();
  });
});
