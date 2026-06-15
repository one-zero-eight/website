import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";

export type TimetableLayoutMode = "groups" | "calendar";

const LAYOUT_OPTIONS: {
  value: TimetableLayoutMode;
  label: string;
}[] = [
  { value: "groups", label: "По группам" },
  { value: "calendar", label: "По дням" },
];

export function TimetableLayoutSelector({
  layoutMode,
  onLayoutModeChange,
  calendarDisabled,
}: {
  layoutMode: TimetableLayoutMode;
  onLayoutModeChange: (mode: TimetableLayoutMode) => void;
  calendarDisabled?: boolean;
}) {
  return (
    <SelectDropdown
      value={layoutMode}
      onChange={onLayoutModeChange}
      options={LAYOUT_OPTIONS}
      triggerClassName="w-[9.5rem]"
      isOptionDisabled={(value) => value === "calendar" && !!calendarDisabled}
    />
  );
}
