import { searchTypes } from "@/api/search";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { decideApproval } from "./ask-session";

type Values = Record<string, string>;
type Row = [label: string, value: string];

// What the assistant is about to do for the user in InNoHassle (book the music room or a room, enrol them in an event, cancel
// a booking, change their calendar, send feedback). Nothing is done until the user approves it here; a newer question in
// the chat drops it undone. The text is the site's own (in the user's language), drawn from the operation and its
// arguments; the user may change the arguments the server marks as editable before approving
export function AskApproval({
  approval,
  isLast,
  isPending,
}: {
  approval: searchTypes.SchemaAskApproval;
  isLast: boolean;
  isPending: boolean;
}) {
  const [values, setValues] = useState<Record<number, Values>>({});
  const editable = isLast && !isPending;

  function change(index: number, field: string, value: string) {
    setValues((all) => ({
      ...all,
      [index]: { ...all[index], [field]: value },
    }));
  }

  // Only what differs from what the assistant proposed goes to the server
  function edits(): searchTypes.SchemaActionEdit[] {
    return approval.actions.flatMap((action, index) => {
      const changed = Object.fromEntries(
        action.fields
          .filter(
            (field) =>
              (values[index]?.[field.name] ?? field.value) !== field.value,
          )
          .map((field) => [field.name, values[index][field.name]]),
      );
      return Object.keys(changed).length ? [{ index, values: changed }] : [];
    });
  }

  return (
    <div className="border-base-300 bg-base-100 rounded-field flex flex-col gap-2 border! p-3">
      <span className="font-medium">
        <Trans>The assistant needs your approval to do this:</Trans>
      </span>
      <ul className="flex flex-col gap-3">
        {approval.actions.map((action, index) => (
          <li key={index} className="flex flex-col gap-1">
            <ActionTitle action={action} />
            <ActionRows action={action} />
            {action.fields.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {action.fields.map((field) => (
                  <ActionField
                    key={field.name}
                    field={field}
                    value={values[index]?.[field.name] ?? field.value}
                    disabled={!editable}
                    onChange={(value) => change(index, field.name, value)}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!isLast ? (
        <span className="text-base-content/60 text-sm">
          <Trans>Not done: a newer question was asked.</Trans>
        </span>
      ) : isPending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => decideApproval("approve", edits())}
          >
            <Trans>Confirm</Trans>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => decideApproval("reject")}
          >
            <Trans>Decline</Trans>
          </button>
        </div>
      )}
    </div>
  );
}

// An RFC 3339 time as the wall clock of its own offset for a datetime-local input: 2026-11-25T18:00:00+03:00 → 2026-11-25T18:00
function toLocalInput(value: string): string {
  return value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)?.[0] ?? "";
}

// The time typed in a datetime-local input back as RFC 3339: with the offset the value had, else the browser's
function fromLocalInput(local: string, previous: string): string {
  if (!local) return "";
  const offset =
    previous.match(/(?:Z|[+-]\d{2}:\d{2})$/)?.[0] ?? browserOffset(local);
  return `${local}:00${offset}`;
}

function browserOffset(local: string): string {
  const minutes = -new Date(local).getTimezoneOffset();
  const sign = minutes < 0 ? "-" : "+";
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0");
  return `${sign}${hours}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function ActionTitle({ action }: { action: searchTypes.SchemaAskAction }) {
  const { t } = useLingui();
  const a = action.args;
  const id = (key: string) => text(a[key]);
  const title = (() => {
    switch (action.target) {
      case "rooms_book_room":
        return t`Book room ${id("room_id")}`;
      case "music_book_music_room":
        return t`Book the music room (sports complex)`;
      case "account_cancel_booking":
        return a.service === "music_room"
          ? t`Cancel your music room booking ${id("booking_id")}`
          : t`Cancel your room booking ${id("booking_id")}`;
      case "events_enroll_in_event":
        return a.leave
          ? t`Cancel your enrolment in event ${id("event_id")}`
          : t`Enrol you in event ${id("event_id")}`;
      case "sport_sport_checkin":
        return a.cancel
          ? t`Cancel your check-in to training #${id("training_id")}`
          : t`Check you in to training #${id("training_id")}`;
      case "events_create_draft":
        return t`Create an event draft (not submitted for moderation, not published)`;
      case "events_update_draft":
        return t`Update event draft ${id("draft_id")} (not submitted for moderation, not published)`;
      case "when2meet_create_meeting":
        return t`Create a When2Meet poll`;
      case "when2meet_set_my_availability":
        return t`Replace all your marked slots in When2Meet ${id("meeting_ref")}`;
      case "add_to_ai_calendar":
        return t`Add to your AI Calendar`;
      case "update_ai_calendar":
        return t`Update event #${id("calendar_event_id")} in your AI Calendar`;
      case "remove_from_ai_calendar":
        return t`Remove event #${id("calendar_event_id")} from your AI Calendar`;
      case "leave_feedback":
        return t`Send feedback to the InNoHassle team`;
      default:
        return t`Run ${action.target}`;
    }
  })();
  return <span>{title}</span>;
}

// The arguments the user cannot change but should see before approving
function ActionRows({ action }: { action: searchTypes.SchemaAskAction }) {
  const { t } = useLingui();
  const a = action.args;
  const rows: Row[] = [];
  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "")
      rows.push([label, text(value)]);
  };
  switch (action.target) {
    case "events_create_draft":
    case "events_update_draft":
      add(t`Language`, a.locale);
      add(t`External registration`, a.registration_url);
      add(t`Club host`, a.club_id);
      break;
    case "when2meet_create_meeting":
      add(t`Time zone`, a.timezone);
      add(t`Mode`, a.specific_time ? t`times` : t`dates`);
      add(t`Slots`, Array.isArray(a.slots) ? a.slots.join(", ") : a.slots);
      break;
    case "when2meet_set_my_availability":
      add(
        t`Slots`,
        Array.isArray(a.availability) && a.availability.length
          ? a.availability.join(", ")
          : t`none (clears all)`,
      );
      break;
    case "add_to_ai_calendar":
    case "update_ai_calendar":
      if (a.all_day) add(t`All day`, t`yes`);
      add(t`End day`, a.end_day);
      if (a.proposed_duration_minutes)
        add(
          t`Suggested duration, minutes`,
          `${text(a.proposed_duration_minutes)} (${t`no end was specified`})`,
        );
      break;
    default:
  }
  if (!rows.length) return null;
  return (
    <dl className="text-base-content/70 flex flex-col text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-1">
          <dt>{label}:</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActionField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: searchTypes.SchemaAskField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useLingui();
  const label = (() => {
    switch (field.name) {
      case "title":
        return t`Title`;
      case "day":
        return t`Date`;
      case "start_time":
        return t`Start`;
      case "end_time":
        return t`End`;
      case "time_from":
        return t`From`;
      case "time_to":
        return t`To`;
      case "room":
        return t`Place`;
      case "name":
        return t`Name`;
      case "description":
        return t`Description`;
      case "starts_at":
        return t`Start`;
      case "location":
        return t`Location`;
      case "duration_hours":
        return t`Duration, hours`;
      case "subject":
        return t`Subject`;
      case "feedback":
        return t`Feedback`;
      default:
        return field.name;
    }
  })();
  const common = {
    value,
    disabled,
    required: field.required,
    maxLength: field.max_length ?? undefined,
    "aria-label": label,
  };
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${field.kind === "textarea" ? "sm:col-span-2" : ""}`}
    >
      <span className="text-base-content/70">{label}</span>
      {field.kind === "textarea" ? (
        <textarea
          {...common}
          rows={3}
          className="textarea textarea-sm w-full"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.name === "starts_at" ? (
        <input
          {...common}
          value={toLocalInput(value)}
          type="datetime-local"
          className="input input-sm w-full"
          onChange={(e) => onChange(fromLocalInput(e.target.value, value))}
        />
      ) : (
        <input
          {...common}
          type={field.kind === "number" ? "number" : field.kind}
          step={field.kind === "number" ? "any" : undefined}
          className="input input-sm w-full"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
