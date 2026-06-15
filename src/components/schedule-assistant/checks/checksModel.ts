import type {
  SchemaCheckParameters,
  SchemaIssue,
} from "@/api/schedule-assistant/types.ts";

export const DEFAULT_CHECK_PARAMETERS: SchemaCheckParameters = {
  check_room: true,
  check_teacher: true,
  check_capacity: true,
  check_group: true,
  check_student: true,
  check_outlook: false,
  check_unbooked: false,
  check_unplaced: true,
  check_per_week: true,
  check_instructor_id: true,
  check_instructor_preference: true,
};

export const ALL_CHECK_PARAMETERS: SchemaCheckParameters = {
  check_room: true,
  check_teacher: true,
  check_capacity: true,
  check_group: true,
  check_student: true,
  check_outlook: true,
  check_unbooked: true,
  check_unplaced: true,
  check_per_week: true,
  check_instructor_id: true,
  check_instructor_preference: true,
};

export const NO_CHECK_PARAMETERS: SchemaCheckParameters = {
  check_room: false,
  check_teacher: false,
  check_capacity: false,
  check_group: false,
  check_student: false,
  check_outlook: false,
  check_unbooked: false,
  check_unplaced: false,
  check_per_week: false,
  check_instructor_id: false,
  check_instructor_preference: false,
};

type CheckParameterKey = keyof SchemaCheckParameters;

export const CHECK_OPTIONS: {
  key: CheckParameterKey;
  label: string;
  description: string;
}[] = [
  {
    key: "check_room",
    label: "Аудитории",
    description: "Пересечения занятий в одной аудитории",
  },
  {
    key: "check_teacher",
    label: "Преподаватели",
    description: "Конфликты преподавания и обучения",
  },
  {
    key: "check_capacity",
    label: "Вместимость",
    description: "Число студентов превышает вместимость комнаты",
  },
  {
    key: "check_group",
    label: "Группы",
    description: "Пересечения расписания одной группы",
  },
  {
    key: "check_student",
    label: "Студенты",
    description: "Студент в нескольких группах с пересечениями",
  },
  {
    key: "check_outlook",
    label: "Outlook",
    description: "Конфликты с бронированиями в Outlook",
  },
  {
    key: "check_unbooked",
    label: "Бронирования",
    description: "Занятия без соответствующего бронирования",
  },
  {
    key: "check_unplaced",
    label: "Неразмещённые",
    description: "Компоненты курса без занятий в расписании",
  },
  {
    key: "check_per_week",
    label: "Частота в неделю",
    description: "Число слотов не совпадает с per_week",
  },
  {
    key: "check_instructor_id",
    label: "ID преподавателей",
    description: "Некорректные идентификаторы преподавателей",
  },
  {
    key: "check_instructor_preference",
    label: "Предпочтения",
    description: "Запрещённые и нежелательные слоты преподавателей",
  },
];

export function areAllChecksEnabled(value: SchemaCheckParameters): boolean {
  return CHECK_OPTIONS.every((option) => value[option.key]);
}

export const ISSUE_TYPE_LABELS: Record<SchemaIssue["issue_type"], string> = {
  room: "Аудитории",
  teacher: "Преподаватели",
  capacity: "Вместимость",
  group: "Группы",
  student: "Студенты",
  outlook: "Outlook",
  unbooked: "Бронирования",
  unplaced: "Неразмещённые",
  per_week: "Частота в неделю",
  instructor_id: "ID преподавателей",
  instructor_banned_slot: "Запрещённые слоты",
  instructor_preference: "Нежелательные слоты",
};

export const ISSUE_TYPE_HEADINGS: Record<SchemaIssue["issue_type"], string> = {
  room: "Пересечение в аудитории",
  teacher: "Конфликт преподавателя",
  capacity: "Превышена вместимость",
  group: "Пересечение у группы",
  student: "Пересечение у студента",
  outlook: "Конфликт с Outlook",
  unbooked: "Нет бронирования",
  unplaced: "Компонент без занятий",
  per_week: "Неверная частота в неделю",
  instructor_id: "Некорректный ID преподавателя",
  instructor_banned_slot: "Запрещённый слот",
  instructor_preference: "Нежелательный слот",
};

export function getIssueMetric(issue: SchemaIssue): string | null {
  switch (issue.issue_type) {
    case "capacity":
      return `${issue.needed_capacity}/${issue.room_capacity ?? "?"} в ауд. ${issue.room}`;
    case "room":
      return `ауд. ${issue.room}`;
    case "group":
      return `группа ${issue.group}`;
    case "student":
      return issue.student;
    case "teacher":
      return issue.instructor;
    case "outlook":
      return issue.outlook_event_title;
    case "instructor_id":
      return issue.instructor_id;
    case "instructor_banned_slot":
    case "instructor_preference":
      return `${issue.instructor_id}, ${issue.weekday} ${String(issue.start_time).slice(0, 5)}`;
    case "unplaced":
      return `${issue.course_name} · ${issue.component_tag}`;
    case "per_week":
      return `${issue.actual_per_week}/${issue.expected_per_week} в неделю`;
    case "unbooked":
      return issue.meeting.room ? `ауд. ${issue.meeting.room}` : null;
    default:
      return null;
  }
}

export const ALL_ISSUE_TYPES_FILTER = "all" as const;

export type IssueTypeFilter =
  | SchemaIssue["issue_type"]
  | typeof ALL_ISSUE_TYPES_FILTER;

export function compareIssueTypes(
  left: SchemaIssue["issue_type"],
  right: SchemaIssue["issue_type"],
) {
  return ISSUE_TYPE_LABELS[left].localeCompare(ISSUE_TYPE_LABELS[right], "ru");
}

export function sortIssuesByTypeOrder(issues: SchemaIssue[]) {
  return [...issues].sort((left, right) =>
    compareIssueTypes(left.issue_type, right.issue_type),
  );
}

export function countIssuesByType(issues: SchemaIssue[]) {
  const counts = new Map<SchemaIssue["issue_type"], number>();
  for (const issue of issues) {
    counts.set(issue.issue_type, (counts.get(issue.issue_type) ?? 0) + 1);
  }
  return counts;
}

export type IssueSeverity = "error" | "warning";

export function getIssueSeverity(issue: SchemaIssue): IssueSeverity {
  if (issue.issue_type === "instructor_preference") return "warning";
  return "error";
}

export function groupIssuesByType(
  issues: SchemaIssue[],
): { issueType: SchemaIssue["issue_type"]; issues: SchemaIssue[] }[] {
  const groups = new Map<SchemaIssue["issue_type"], SchemaIssue[]>();

  for (const issue of issues) {
    const existing = groups.get(issue.issue_type);
    if (existing) {
      existing.push(issue);
      continue;
    }
    groups.set(issue.issue_type, [issue]);
  }

  return [...groups.entries()]
    .map(([issueType, groupedIssues]) => ({
      issueType,
      issues: groupedIssues,
    }))
    .sort((left, right) => compareIssueTypes(left.issueType, right.issueType));
}
