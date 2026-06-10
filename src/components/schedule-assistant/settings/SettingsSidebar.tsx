import {
  CourseDetails,
  GroupDetails,
  GroupNotFoundNotice,
  InstructorDetails,
  ProgramDetails,
  RoomDetails,
  SelectItemNotice,
  TrackDetails,
} from "@/components/schedule-assistant/settings/SettingsSidebarDetails.tsx";
import {
  isSettingsSelectionValid,
  resolveGroupsSelection,
} from "@/components/schedule-assistant/settings/groups/groupsSelection.ts";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import { useSelection } from "@/components/schedule-assistant/settings/useSelection.tsx";
import { useMemo } from "react";

export function SettingsSidebar() {
  const { config } = useConfig();
  const { selectedSelection, settingsSubTab } = useSelection();
  const groupsSelection = useMemo(
    () => resolveGroupsSelection(config, selectedSelection),
    [config, selectedSelection],
  );

  if (settingsSubTab === "semester") {
    return null;
  }

  if (!selectedSelection) {
    return <SelectItemNotice />;
  }

  if (!isSettingsSelectionValid(config, settingsSubTab, selectedSelection)) {
    if (settingsSubTab === "groups") {
      return <GroupNotFoundNotice />;
    }
    return <SelectItemNotice />;
  }

  if (settingsSubTab === "courses" && selectedSelection.kind === "course") {
    return <CourseDetails courseIndex={selectedSelection.courseIndex} />;
  }

  if (settingsSubTab === "rooms" && selectedSelection.kind === "room") {
    const room = config?.rooms?.[selectedSelection.roomIndex];
    return <RoomDetails roomId={String(room?.id ?? "")} />;
  }

  if (
    settingsSubTab === "instructors" &&
    selectedSelection.kind === "instructor"
  ) {
    return (
      <InstructorDetails instructorIndex={selectedSelection.instructorIndex} />
    );
  }

  if (settingsSubTab === "groups" && groupsSelection) {
    if (groupsSelection.kind === "program") {
      return (
        <ProgramDetails
          sectionCode={groupsSelection.sectionCode}
          programIndex={groupsSelection.programIndex}
        />
      );
    }
    if (groupsSelection.kind === "track") {
      return (
        <TrackDetails
          sectionCode={groupsSelection.sectionCode}
          programIndex={groupsSelection.programIndex}
          trackIndex={groupsSelection.trackIndex}
          titleFallback={groupsSelection.titleFallback}
        />
      );
    }
    return (
      <GroupDetails
        groupId={groupsSelection.groupId}
        sectionCode={groupsSelection.sectionCode}
        programIndex={groupsSelection.programIndex}
        trackIndex={groupsSelection.trackIndex}
        titleFallback={groupsSelection.titleFallback}
      />
    );
  }

  return <SelectItemNotice />;
}
