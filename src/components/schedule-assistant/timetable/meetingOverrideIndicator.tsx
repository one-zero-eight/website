import type { MeetingOverrideField } from "./timetableViewerModel.ts";

export const MEETING_OVERRIDE_FIELD_LABELS: Record<
  MeetingOverrideField,
  string
> = {
  room: "аудитория",
  time: "время",
  weekday: "день недели",
  instructor: "преподаватель",
};

export function formatMeetingOverrideFields(
  fields: MeetingOverrideField[] | undefined,
) {
  if (!fields?.length) return "";
  return fields.map((field) => MEETING_OVERRIDE_FIELD_LABELS[field]).join(", ");
}

export function MeetingOverrideIndicator({
  fields,
  compact = false,
}: {
  fields: MeetingOverrideField[] | undefined;
  compact?: boolean;
}) {
  if (!fields?.length) return null;

  const title = `Переопределено: ${formatMeetingOverrideFields(fields)}`;

  if (compact) {
    return (
      <span className="badge badge-info badge-xs shrink-0" title={title}>
        переопр.
      </span>
    );
  }

  return (
    <span className="badge badge-info badge-sm shrink-0" title={title}>
      переопр.: {formatMeetingOverrideFields(fields)}
    </span>
  );
}

export function MeetingOverrideFieldBadge({
  field,
  fields,
}: {
  field: MeetingOverrideField;
  fields: MeetingOverrideField[] | undefined;
}) {
  if (!fields?.includes(field)) return null;

  return <MeetingOverrideIndicator fields={[field]} compact />;
}
