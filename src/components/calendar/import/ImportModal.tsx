import { $schedule } from "@/api/schedule";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useState } from "react";
import ScheduleLinkInput from "@/components/calendar/ScheduleLinkInput.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { ImportColorsPalette } from "@/components/calendar/import/ColorsPalette.tsx";

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
  prevAlias,
  prevName = "",
  prevDescription,
  prevUrl,
  aboveModal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  prevAlias?: string | null;
  prevName?: string | null;
  prevDescription?: string | null;
  prevUrl?: string | null;
  aboveModal?: boolean;
}) {
  const { data: eventsUser } = $schedule.useQuery("get", "/users/me");
  const { mutate: addLink } = $schedule.useMutation("post", "/users/me/linked");

  const [calendarURL, setCalendarURL] = useState(prevUrl ?? "");

  const [calendarName, setCalendarName] = useState(prevName ?? "");
  const [calendarDescription, setCalendarDescription] = useState(
    prevDescription ?? "",
  );
  const [calendarColor, setCalendarColor] = useState("#9747ff");
  const [showColors, setShowColors] = useState(false);
  const [isCalendarChecked, setIsCalendarChecked] = useState(false);

  const username = toAliasPart(eventsUser?.email ?? "") || "user";
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
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await addLink({
            body: {
              alias: prevAlias ?? `${username}_${normalizedCalendarName}`,
              url: calendarURL,
              name: calendarName,
              description: calendarDescription,
              color: calendarColor,
              is_active: true,
            },
          });
          await onSubmit();
        }}
        className="text-base-content/75"
      >
        <label htmlFor="calendarName" className="ml-1">
          Name
        </label>
        <input
          id="calendarName"
          value={calendarName}
          onChange={(e) => setCalendarName(e.target.value)}
          placeholder="Name for your calendar..."
          className="input bg-base-200 mb-3 w-full grow rounded-xl border-0 p-2 text-base outline-none"
          disabled={!!prevName}
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
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={
                calendarName.length === 0 ||
                !isCalendarChecked ||
                (calendarURL === prevUrl &&
                  prevDescription === calendarDescription)
              }
            >
              Submit
            </button>
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
          viewId="popup"
          onEventSourceSuccess={() => setIsCalendarChecked(true)}
          isHidden={!showPreview}
        />
      )}
    </Modal>
  );
}
