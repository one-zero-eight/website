import { $schedule } from "@/api/schedule";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useEffect, useRef, useState } from "react";
import ScheduleLinkInput from "@/components/calendar/ScheduleLinkInput.tsx";
import { Modal } from "@/components/common/Modal.tsx";

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
  aboveModal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aboveModal?: boolean;
}) {
  const { data: eventsUser } = $schedule.useQuery("get", "/users/me");
  const { mutate: addLink } = $schedule.useMutation("post", "/users/me/linked");

  const colorsMenuRef = useRef<HTMLDivElement>(null);
  const chooseColorButtonRef = useRef<HTMLButtonElement>(null);

  const [calendarURL, setCalendarURL] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarColor, setCalendarColor] = useState("#9747ff");

  const username = toAliasPart(eventsUser?.email ?? "") || "user";
  const normalizedCalendarName = toAliasPart(calendarName) || "calendar";

  const [showPreview, setShowPreview] = useState(true);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (
        !colorsMenuRef.current ||
        colorsMenuRef.current.contains(event.target as Node) ||
        !chooseColorButtonRef.current ||
        chooseColorButtonRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setShowColors(false);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, []);

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
        onSubmit={() =>
          addLink({
            body: {
              alias: `${username}_${normalizedCalendarName}`,
              url: calendarURL,
              name: calendarName,
              description: calendarDescription,
              color: calendarColor,
              is_active: true,
            },
          })
        }
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
          className="bg-base-200 mb-3 w-full grow rounded-xl p-2 focus:outline-none"
        />
        <label htmlFor="calendarURL" className="ml-1">
          Calendar URL
        </label>
        <ScheduleLinkInput
          id="calendarURL"
          url={calendarURL}
          setURL={setCalendarURL}
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
          <button
            type="button"
            className="mb-7 ml-1"
            onClick={() => setShowColors((showColors) => !showColors)}
            ref={chooseColorButtonRef}
          >
            Choose color
          </button>
          {showColors && (
            <div
              ref={colorsMenuRef}
              className="bg-base-300 absolute -top-45 left-0 z-10 grid w-fit grid-cols-4 rounded-md p-2 shadow-xl md:-top-14 md:left-30 md:grid-cols-6"
            >
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`m-0.75 h-5 w-5 rounded-full`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCalendarColor(color)}
                >
                  {color === calendarColor && (
                    <span className="icon-[mdi--tick] text-sm" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {calendarURL.length > 0 && (
          <div className="mt-2 flex justify-between px-3">
            <button
              type="button"
              className="link link-primary text-md no-underline hover:underline"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <button type="submit" className="btn btn-primary btn-md">
              Import
            </button>
          </div>
        )}
      </form>
      {/* Calendar itself */}
      {showPreview && calendarURL.length > 0 && (
        <Calendar
          urls={[
            {
              url: calendarURL,
              color: calendarColor,
            },
          ]}
          viewId="popup"
        />
      )}
    </Modal>
  );
}

const colors = [
  "brown",
  "cadetblue",
  "chocolate",
  "darkcyan",
  "darkgreen",
  "darkmagenta",
  "darkolivegreen",
  "darkred",
  "darkslateblue",
  "darkslategray",
  "dimgray",
  "firebrick",
  "forestgreen",
  "gray",
  "indianred",
  "lightslategray",
  "maroon",
  "mediumvioletred",
  "midnightblue",
  "indigo",
  "rebeccapurple",
  "seagreen",
  "teal",
  "#9747ff",
];
