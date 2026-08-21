import type { SchemaIssue } from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { IssueListItem } from "@/components/schedule-assistant/checks/IssueListItem.tsx";
import { useChecksSession } from "@/components/schedule-assistant/checks/checksSession.tsx";
import {
  ALL_ISSUE_TYPES_FILTER,
  compareIssueTypes,
  countIssuesByType,
  ISSUE_TYPE_LABELS,
  sortIssuesByTypeOrder,
  type IssueTypeFilter,
} from "@/components/schedule-assistant/checks/checksModel.ts";
import {
  buildInstructorsById,
  buildMeetingInstanceIndex,
} from "@/components/schedule-assistant/checks/issueMeetings.ts";
import { groupIssuesByProgram } from "@/components/schedule-assistant/checks/issueProgramGrouping.ts";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import { buildMeetings } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { useEffect, useMemo, useState } from "react";

type IssueGroupingMode = "none" | "program";

const GROUPING_OPTIONS: { value: IssueGroupingMode; label: string }[] = [
  { value: "none", label: "Без группировки" },
  { value: "program", label: "По программам" },
];

export function IssuesResults({
  issues,
  hasRun,
}: {
  issues: SchemaIssue[];
  hasRun: boolean;
}) {
  const { selectedIssueType, setSelectedIssueType } = useChecksSession();
  const { config } = useConfig();
  const [grouping, setGrouping] = useState<IssueGroupingMode>("none");

  const meetingIndex = useMemo(() => {
    if (!config) return buildMeetingInstanceIndex([]);
    return buildMeetingInstanceIndex(buildMeetings(config));
  }, [config]);

  const instructorsById = useMemo(
    () => buildInstructorsById(config?.instructors),
    [config?.instructors],
  );

  const countsByType = useMemo(() => countIssuesByType(issues), [issues]);

  const typeOptions = useMemo(
    () => [
      {
        value: ALL_ISSUE_TYPES_FILTER,
        label: `Все (${issues.length})`,
      },
      ...[...countsByType.entries()]
        .sort((left, right) => compareIssueTypes(left[0], right[0]))
        .map(([issueType, count]) => ({
          value: issueType as IssueTypeFilter,
          label: `${ISSUE_TYPE_LABELS[issueType]} (${count})`,
        })),
    ],
    [countsByType, issues.length],
  );

  useEffect(() => {
    if (!issues.length) {
      setSelectedIssueType(ALL_ISSUE_TYPES_FILTER);
      return;
    }
    if (selectedIssueType === ALL_ISSUE_TYPES_FILTER) return;
    if (issues.some((issue) => issue.issue_type === selectedIssueType)) return;
    setSelectedIssueType(ALL_ISSUE_TYPES_FILTER);
  }, [issues, selectedIssueType, setSelectedIssueType]);

  const filteredIssues = useMemo(() => {
    if (selectedIssueType === ALL_ISSUE_TYPES_FILTER) {
      return sortIssuesByTypeOrder(issues);
    }
    return issues.filter((issue) => issue.issue_type === selectedIssueType);
  }, [issues, selectedIssueType]);

  const programGroups = useMemo(() => {
    if (grouping !== "program") return [];
    return groupIssuesByProgram(filteredIssues, config);
  }, [config, filteredIssues, grouping]);

  if (!hasRun) {
    return (
      <div className="border-base-300 bg-base-100 rounded-box flex min-h-48 items-center justify-center border p-6 text-center">
        <p className="text-base-content/70 text-sm">
          Нажмите «Запустить проверку», чтобы проверить текущее расписание.
        </p>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="alert alert-success">
        <span className="icon-[material-symbols--check-circle-outline] text-xl" />
        <span>Проблем не найдено.</span>
      </div>
    );
  }

  return (
    <div className="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-4">
      <div className="flex flex-col gap-2">
        <p className="text-base-content/70 text-xs leading-relaxed">
          {typeOptions
            .filter((option) => option.value !== ALL_ISSUE_TYPES_FILTER)
            .map((option, index) => (
              <span key={option.value}>
                {index > 0 ? " · " : null}
                {option.label}
              </span>
            ))}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {typeOptions.length > 0 ? (
            <SelectDropdown
              value={selectedIssueType}
              onChange={setSelectedIssueType}
              options={typeOptions}
              className="w-full sm:max-w-md sm:flex-1"
              triggerClassName="select-sm h-9 min-h-9"
            />
          ) : null}
          <SelectDropdown
            value={grouping}
            onChange={setGrouping}
            options={GROUPING_OPTIONS}
            className="w-full sm:max-w-xs sm:flex-1"
            triggerClassName="select-sm h-9 min-h-9"
          />
        </div>
        <p className="text-base-content/70 text-xs">
          Показано {filteredIssues.length} из {issues.length}
        </p>
      </div>

      {grouping === "none" ? (
        <div className="flex flex-col">
          {filteredIssues.map((issue, index) => (
            <IssueListItem
              key={`${selectedIssueType}-${index}`}
              issue={issue}
              meetingIndex={meetingIndex}
              instructorsById={instructorsById}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {programGroups.map((group) => (
            <section key={group.key} className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">
                {group.title}{" "}
                <span className="text-base-content/60 font-normal">
                  ({group.issues.length})
                </span>
              </h3>
              <div className="flex flex-col">
                {group.issues.map((issue, index) => (
                  <IssueListItem
                    key={`${group.key}-${selectedIssueType}-${index}`}
                    issue={issue}
                    meetingIndex={meetingIndex}
                    instructorsById={instructorsById}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
