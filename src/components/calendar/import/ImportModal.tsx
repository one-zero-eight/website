import { $schedule } from "@/api/schedule";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { SubmitEvent, useState } from "react";
import ScheduleLinkInput from "@/components/calendar/ScheduleLinkInput.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { ImportColorsPalette } from "@/components/calendar/import/ColorsPalette.tsx";
import { useToast } from "@/components/toast";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import { queryClient } from "@/app/query-client.ts";
import { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";

function toAliasPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ImportModal({
  open,
  onOpenChange,
  onSubmit,
  prevCalendar,
  aboveModal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  prevCalendar?: SchemaLinkedCalendarView;
  aboveModal?: boolean;
}) {
  const { data: eventsUser } = $schedule.useQuery("get", "/users/me");
  const { mutate: postLinkedCalendar } = $schedule.useMutation(
    "post",
    "/users/me/linked",
  );
  const { mutate: patchLinkedCalendar } = $schedule.useMutation(
    "patch",
    "/users/me/linked",
  );

  const onSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });
    onSubmit();
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    return prevCalendar?.alias
      ? patchLinkedCalendar(
          {
            body: {
              alias: prevCalendar.alias,
              url: calendarURL,
              name: calendarName,
              description: calendarDescription,
              color: calendarColor,
              is_active: true,
            },
            params: { query: { alias: prevCalendar.alias } },
          },
          {
            onSuccess,
            onError: (error) => {
              showError("Calendar update failed", formatApiErrorMessage(error));
            },
          },
        )
      : postLinkedCalendar(
          {
            body: {
              alias: `${username}_${normalizedCalendarName}`,
              url: calendarURL,
              name: calendarName,
              description: calendarDescription,
              color: calendarColor,
              is_active: true,
            },
          },
          {
            onSuccess,
            onError: (error) => {
              showError("Import failed", formatApiErrorMessage(error));
            },
          },
        );
  };

  const { showError } = useToast();

  const [calendarURL, setCalendarURL] = useState(prevCalendar?.url ?? "");

  const [calendarName, setCalendarName] = useState(prevCalendar?.name ?? "");
  const [calendarDescription, setCalendarDescription] = useState(
    prevCalendar?.description ?? "",
  );
  const [calendarColor, setCalendarColor] = useState(
    prevCalendar?.color ?? "#9747ff",
  );
  const [showColors, setShowColors] = useState(false);
  const [isCalendarChecked, setIsCalendarChecked] = useState(
    prevCalendar != null,
  );

  const username = toAliasPart(eventsUser?.email ?? "") || "user";
  const normalizedCalendarName = toAliasPart(calendarName) || "calendar";
  const calendarNotUpdated =
    prevCalendar != null &&
    calendarURL === prevCalendar.url &&
    calendarDescription === prevCalendar.description &&
    calendarColor === prevCalendar.color;

  const [showPreview, setShowPreview] = useState(true);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import your calendar to InNoHassle"
      overlayClassName={aboveModal ? "bg-black/50 items-start" : ""}
      containerClassName="max-w-full xl:max-w-[75%] bg-base-100"
    >
      <div className="text-base-content/75 mb-3">
        You can add your schedule to InNoHassle and it will be updated on
        schedule changes.
      </div>
      <form onSubmit={handleSubmit} className="text-base-content/75">
        <label htmlFor="calendarName" className="ml-1">
          Name
        </label>
        <input
          id="calendarName"
          value={calendarName}
          onChange={(e) => setCalendarName(e.target.value)}
          placeholder="Name for your calendar..."
          className="input bg-base-200 mb-3 w-full grow rounded-xl border-0 p-2 text-base outline-none"
          disabled={!!prevCalendar?.name}
        />
        <label htmlFor="calendarURL" className="ml-1">
          Calendar URL
        </label>
        <ScheduleLinkInput
          id="calendarURL"
          url={calendarURL}
          setURL={(url) => {
            setCalendarURL(url);
            setIsCalendarChecked(false);
          }}
          isCalendarChecked={isCalendarChecked}
        />
        <label htmlFor="description" className="ml-1">
          Description
        </label>
        <textarea
          id="description"
          value={calendarDescription}
          onChange={(e) => setCalendarDescription(e.target.value)}
          rows={2}
          className="textarea bg-base-200 mb-3 w-full rounded-xl border-none text-base focus:outline-none"
          placeholder="Description for your calendar..."
        />
        <div className="relative">
          <ImportColorsPalette
            calendarColor={calendarColor}
            setCalendarColor={setCalendarColor}
            showColors={showColors}
            setShowColors={setShowColors}
          />
        </div>
        {isCalendarChecked && (
          <div className="mt-2 flex items-start justify-between px-3">
            <button
              type="button"
              className="link link-primary text-md no-underline hover:underline"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={
                calendarName.length === 0 ||
                !isCalendarChecked ||
                calendarNotUpdated
              }
            >
              Submit
            </button>
          </div>
        )}
      </form>
      {/* Calendar itself */}
      {calendarURL.length > 0 && URL.canParse(calendarURL) && (
        <Calendar
          urls={[
            {
              url: calendarURL,
              color: calendarColor,
            },
          ]}
          viewId="popup"
          onEventSourceSuccess={() => setIsCalendarChecked(true)}
          isHidden={!showPreview || !isCalendarChecked}
        />
      )}
    </Modal>
  );
}
