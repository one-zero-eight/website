import { $schedule } from "@/api/schedule";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useState } from "react";
import ScheduleLinkInput from "@/components/calendar/ScheduleLinkInput.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { ImportColorsPalette } from "@/components/calendar/import/ColorsPalette.tsx";
import { useToast } from "@/components/toast";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import { queryClient } from "@/app/query-client.ts";
import type { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";

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
  prevLinkedCalendar,
  aboveModal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  prevLinkedCalendar?: SchemaLinkedCalendarView;
  aboveModal?: boolean;
}) {
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { mutate: postLinkedCalendar } = $schedule.useMutation(
    "post",
    "/users/me/linked",
  );
  const { mutate: patchLinkedCalendar } = $schedule.useMutation(
    "patch",
    "/users/me/linked",
  );
  const { mutate: deleteLinkedCalendar, isPending: isDeleting } =
    $schedule.useMutation("delete", "/users/me/linked");

  const onSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });
    onSubmit();
  };

  const handleSubmit = (event: React.SubmitEvent) => {
    event.preventDefault();
    return prevLinkedCalendar
      ? patchLinkedCalendar(
          {
            body: {
              alias: prevLinkedCalendar.alias,
              url: calendarURL,
              name: calendarName,
              description: calendarDescription,
              color: calendarColor,
              is_active: true,
            },
            params: { query: { alias: prevLinkedCalendar.alias } },
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

  const { showConfirm, showError } = useToast();

  const handleDelete = async () => {
    if (!prevLinkedCalendar) return;

    const confirmed = await showConfirm({
      title: "Delete calendar",
      message: `Delete "${calendarName}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) return;

    deleteLinkedCalendar(
      { params: { query: { alias: prevLinkedCalendar.alias } } },
      {
        onSuccess,
        onError: (error) => {
          showError("Calendar deletion failed", formatApiErrorMessage(error));
        },
      },
    );
  };

  const [calendarURL, setCalendarURL] = useState(prevLinkedCalendar?.url ?? "");

  const [calendarName, setCalendarName] = useState(
    prevLinkedCalendar?.name ?? "",
  );
  const [calendarDescription, setCalendarDescription] = useState(
    prevLinkedCalendar?.description ?? "",
  );
  const [calendarColor, setCalendarColor] = useState(
    prevLinkedCalendar?.color ?? "#9747ff",
  );
  const [showColors, setShowColors] = useState(false);
  const [isCalendarChecked, setIsCalendarChecked] = useState(false);

  const username = toAliasPart(scheduleUser?.email ?? "") || "user";
  const normalizedCalendarName = toAliasPart(calendarName) || "calendar";

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
          disabled={!!prevLinkedCalendar}
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
        {calendarURL.length > 0 && (
          <div className="mt-2 flex items-start justify-between px-3">
            <button
              type="button"
              className="link link-primary text-md no-underline hover:underline"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <div className="flex gap-2">
              {prevLinkedCalendar && (
                <button
                  type="button"
                  className="btn btn-error btn-md"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-md"
                disabled={
                  calendarName.length === 0 ||
                  !isCalendarChecked ||
                  (calendarURL === prevLinkedCalendar?.url &&
                    prevLinkedCalendar.description === calendarDescription &&
                    calendarColor === (prevLinkedCalendar.color ?? "#9747ff"))
                }
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </form>
      {/* Calendar itself */}
      {calendarURL.length > 0 && (
        <Calendar
          urls={[
            {
              url: calendarURL,
              color: calendarColor,
            },
          ]}
          viewStorageId="popup"
          onEventSourceSuccess={() => setIsCalendarChecked(true)}
          isHidden={!showPreview}
        />
      )}
    </Modal>
  );
}
