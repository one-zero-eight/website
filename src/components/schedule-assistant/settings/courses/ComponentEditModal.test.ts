import { act, createElement, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { ComponentEditModal } from "./ComponentEditModal.tsx";

vi.mock("@/components/common/Modal.tsx", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? children : null,
}));
vi.mock("@/components/common/SelectDropdown.tsx", () => ({
  SelectDropdown: () => null,
}));
vi.mock("./InstructorPoolEditor.tsx", () => ({
  InstructorPoolEditor: () => null,
}));
vi.mock("./ComponentSessionsEditor.tsx", () => ({
  ComponentSessionsEditor: ({
    onValidityChange,
    onDeletedDirtyChange,
    sessionsForSaveRef,
    resetKey,
  }: {
    onValidityChange: (valid: boolean) => void;
    onDeletedDirtyChange: (dirty: boolean) => void;
    sessionsForSaveRef: { current: (() => null) | null };
    resetKey: number;
  }) => {
    const [invalid, setInvalid] = useState(false);
    useEffect(() => {
      onValidityChange(!invalid);
    }, [invalid, onValidityChange]);
    useEffect(() => {
      setInvalid(false);
    }, [resetKey]);
    useEffect(() => {
      sessionsForSaveRef.current = () => null;
      return () => {
        sessionsForSaveRef.current = null;
      };
    }, [sessionsForSaveRef]);
    return createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          setInvalid(true);
          onDeletedDirtyChange(true);
        },
      },
      "Invalid custom draft",
    );
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const config = {
  term: { sections: [] },
  courses: [{ section_code: "main" }],
  students_groups: [],
} as unknown as SchemaScheduleConfig;
const component = {
  tag: "lec",
  audience: [],
  sessions: [{ audience: [], active: null, weekly_pattern: [] }],
} as unknown as SchemaComponent;

it("gates saving invalid drafts across tabs, resets them and honors an explicit null sessions result", async () => {
  const onSave = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(ComponentEditModal, {
        open: true,
        onOpenChange: vi.fn(),
        config,
        courseIndex: 0,
        componentIndex: 0,
        component,
        isNew: true,
        tagOptions: ["lec"],
        instructors: [],
        courseInstructors: [],
        onSave,
      }),
    ),
  );
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === text,
    )!;
  expect(button("Сохранить").disabled).toBe(false);
  await act(async () => button("Занятия1").click());
  await act(async () => button("Invalid custom draft").click());
  expect(button("Сохранить").disabled).toBe(true);
  await act(async () => button("Основное").click());
  expect(button("Сохранить").disabled).toBe(true);
  expect(container.textContent).toContain("Исправьте периоды или даты серий");
  await act(async () => button("Сбросить изменения").click());
  expect(button("Сохранить").disabled).toBe(false);
  await act(async () => button("Сохранить").click());
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ sessions: null }),
  );
  await act(async () => root.unmount());
});
