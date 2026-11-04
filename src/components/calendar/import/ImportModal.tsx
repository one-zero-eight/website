import { $schedule } from "@/api/schedule";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useState } from "react";
import ScheduleLinkInput from "@/components/calendar/ScheduleLinkInput.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { ImportColorsPalette } from "@/components/calendar/import/ColorsPalette.tsx";
import { useToast } from "@/components/toast";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client.ts";
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
  const { t } = useLingui();
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
              showError(
                msg`Calendar update failed`,
                formatApiErrorDescriptor(error),
              );
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
              showError(msg`Import failed`, formatApiErrorDescriptor(error));
            },
          },
        );
  };

  const { showConfirm, showError } = useToast();

  const handleDelete = async () => {
    if (!prevLinkedCalendar) return;

    const confirmed = await showConfirm({
      title: msg`Delete calendar`,
      message: msg`Delete "${calendarName}"? This cannot be undone.`,
      confirmText: msg`Delete`,
      cancelText: msg`Cancel`,
      type: "error",
    });
    if (!confirmed) return;

    deleteLinkedCalendar(
      { params: { query: { alias: prevLinkedCalendar.alias } } },
      {
        onSuccess,
        onError: (error) => {
          showError(
            msg`Calendar deletion failed`,
            formatApiErrorDescriptor(error),
          );
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
      title={t`Import your calendar to InNoHassle`}
      overlayClassName={aboveModal ? "bg-black/50 items-start" : ""}
      containerClassName="max-w-full xl:max-w-[75%] bg-base-100"
    >
      <div className="text-base-content/75 mb-3">
        <Trans>
          You can add your schedule to InNoHassle and it will be updated on
          schedule changes.
        </Trans>
      </div>
      <form onSubmit={handleSubmit} className="text-base-content/75">
        <label htmlFor="calendarName" className="ml-1">
          <Trans>Name</Trans>
        </label>
        <input
          id="calendarName"
          value={calendarName}
          onChange={(e) => setCalendarName(e.target.value)}
          placeholder={t`Name for your calendar...`}
          className="input bg-base-200 mb-3 w-full grow rounded-xl border-0 p-2 text-base outline-none"
          disabled={!!prevLinkedCalendar}
        />
        <label htmlFor="calendarURL" className="ml-1">
          <Trans>Calendar URL</Trans>
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
          <Trans>Description</Trans>
        </label>
        <textarea
          id="description"
          value={calendarDescription}
          onChange={(e) => setCalendarDescription(e.target.value)}
          rows={2}
          className="textarea bg-base-200 mb-3 w-full rounded-xl border-none text-base focus:outline-none"
          placeholder={t`Description for your calendar...`}
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
              {showPreview ? (
                <Trans>Hide preview</Trans>
              ) : (
                <Trans>Show preview</Trans>
              )}
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
                  <Trans>Delete</Trans>
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
                <Trans>Submit</Trans>
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
