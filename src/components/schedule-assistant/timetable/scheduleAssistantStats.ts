/** Минимальные поля встречи для подсчёта сводки. */
export type MeetingSummaryInput = {
  course: string;
  room: string;
  instructors: string[];
};

/** Глобальная сводка по загруженным YAML (для вкладки «Настройки»). */
export function computeGlobalScheduleSummary(input: {
  config: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  meetings: MeetingSummaryInput[];
  columnsCount: number;
}) {
  const { config, output, meetings, columnsCount } = input;
  if (!config || !output) return null;

  const term = (config.term as { name?: string } | undefined)?.name ?? "—";
  const status = String((output as { status?: string }).status ?? "—");

  const courseSet = new Set<string>();
  const instructorSet = new Set<string>();
  const roomSet = new Set<string>();
  for (const m of meetings) {
    if (m.course) courseSet.add(m.course);
    for (const i of m.instructors || []) instructorSet.add(i);
    if (m.room) roomSet.add(m.room);
  }

  return {
    status,
    term,
    columnsCount,
    totalEvents: meetings.length,
    uniqueCourses: courseSet.size,
    uniqueInstructors: instructorSet.size,
    uniqueRooms: roomSet.size,
  };
}
