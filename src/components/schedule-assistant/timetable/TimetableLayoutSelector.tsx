import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { useLingui } from "@lingui/react/macro";

export type TimetableLayoutMode = "groups" | "compact_groups" | "calendar";

export function TimetableLayoutSelector({
  layoutMode,
  onLayoutModeChange,
  calendarDisabled,
}: {
  layoutMode: TimetableLayoutMode;
  onLayoutModeChange: (mode: TimetableLayoutMode) => void;
  calendarDisabled?: boolean;
}) {
  const { t } = useLingui();
  const layoutOptions: { value: TimetableLayoutMode; label: string }[] = [
    { value: "groups", label: t`By groups` },
    { value: "compact_groups", label: t`By groups (compact)` },
    { value: "calendar", label: t`By days` },
  ];

  return (
    <SelectDropdown
      value={layoutMode}
      onChange={onLayoutModeChange}
      options={layoutOptions}
      triggerClassName="w-[9.5rem]"
      isOptionDisabled={(value) => value === "calendar" && !!calendarDisabled}
    />
  );
}
