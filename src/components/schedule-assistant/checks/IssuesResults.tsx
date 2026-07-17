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
import { useEffect, useMemo } from "react";

export function IssuesResults({
  issues,
  hasRun,
}: {
  issues: SchemaIssue[];
  hasRun: boolean;
}) {
  const { selectedIssueType, setSelectedIssueType } = useChecksSession();

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
        {typeOptions.length > 0 ? (
          <SelectDropdown
            value={selectedIssueType}
            onChange={setSelectedIssueType}
            options={typeOptions}
            className="w-full sm:max-w-md"
            triggerClassName="select-sm h-9 min-h-9"
          />
        ) : null}
        <p className="text-base-content/70 text-xs">
          Показано {filteredIssues.length} из {issues.length}
        </p>
      </div>

      <div className="flex flex-col">
        {filteredIssues.map((issue, index) => (
          <IssueListItem key={`${selectedIssueType}-${index}`} issue={issue} />
        ))}
      </div>
    </div>
  );
}
