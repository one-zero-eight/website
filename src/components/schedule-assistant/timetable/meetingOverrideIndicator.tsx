import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { MeetingOverrideField } from "./timetableViewerModel.ts";

const MEETING_OVERRIDE_FIELD_LABELS = {
  room: msg`location`,
  time: msg`time`,
  weekday: msg`weekday`,
  instructor: msg`instructor`,
} satisfies Record<MeetingOverrideField, unknown>;

export function meetingOverrideFieldLabel(field: MeetingOverrideField) {
  return i18n._(MEETING_OVERRIDE_FIELD_LABELS[field]);
}

export function formatMeetingOverrideFields(
  fields: MeetingOverrideField[] | undefined,
) {
  if (!fields?.length) return "";
  return fields.map(meetingOverrideFieldLabel).join(", ");
}

export function MeetingOverrideIndicator({
  fields,
  compact = false,
}: {
  fields: MeetingOverrideField[] | undefined;
  compact?: boolean;
}) {
  const { t } = useLingui();
  if (!fields?.length) return null;

  const overriddenFields = formatMeetingOverrideFields(fields);
  const title = t`Overridden: ${overriddenFields}`;

  if (compact) {
    return (
      <span className="badge badge-info badge-xs shrink-0" title={title}>
        <Trans>override</Trans>
      </span>
    );
  }

  return (
    <span className="badge badge-info badge-sm shrink-0" title={title}>
      <Trans>override: {overriddenFields}</Trans>
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
