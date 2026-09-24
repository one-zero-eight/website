import { $schedule } from "@/api/schedule";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
import { useRef } from "react";
import { getICSLink, getPersonalLink } from "@/api/schedule/links.ts";
import { TargetForExport } from "@/api/schedule/types.ts";

export type ExportTarget =
  | { type: "event-group"; alias: string }
  | { type: "personal"; target: TargetForExport };

export function ExportModal({
  target,
  open,
  onOpenChange,
  aboveModal = false,
}: {
  target: ExportTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aboveModal?: boolean;
}) {
  const eventGroupAlias = target?.type === "event-group" ? target.alias : null;
  const personalTarget = target?.type === "personal" ? target.target : null;
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { data: eventGroup } = $schedule.useQuery(
    "get",
    "/event-groups/by-alias",
    {
      params: { query: { alias: eventGroupAlias ?? "" } },
    },
    {
      enabled: eventGroupAlias !== null,
    },
  );

  const { data: scheduleKey } = $schedule.useQuery(
    "post",
    "/users/me/get-schedule-access-key",
    {
      params: {
        query: {
          resource_path: `/users/${scheduleUser?.id}/${personalTarget}.ics`,
        },
      },
    },
    {
      enabled: personalTarget !== null && scheduleUser !== undefined,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const copyButtonRef = useRef(null);

  let calendarURL = "";
  if (eventGroupAlias) {
    calendarURL = getICSLink(eventGroupAlias, scheduleUser?.id, "url");
  }

  if (personalTarget && scheduleKey) {
    calendarURL = getPersonalLink(
      scheduleKey.access_key.resource_path,
      scheduleKey.access_key.access_key,
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        personalTarget
          ? modalText[personalTarget].title
          : "Export to your calendar"
      }
      overlayClassName={aboveModal ? "bg-black/50" : ""}
      containerClassName="max-w-full xl:max-w-[75%] bg-base-100"
    >
      <div className="text-base-content/75">
        {personalTarget
          ? modalText[personalTarget].description
          : "You can add the schedule to your favorite calendar application and it will be updated on schedule changes."}
      </div>
      <ul className="text-base-content/75 list-decimal pb-4 pl-5">
        <li>
          Copy the link.
          <ScheduleLinkCopy
            url={calendarURL || ""}
            copyButtonRef={copyButtonRef}
          />
        </li>
        <li>
          Open your calendar settings to add a calendar by URL.
          <a
            className="ml-4 flex w-fit flex-row items-center gap-x-2 underline"
            href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
            target="_blank"
          >
            <span className="icon-[material-symbols--link] text-base-content/50" />
            Google Calendar
          </a>
          <a className="ml-4 flex w-fit flex-row items-center gap-x-2">
            <span className="icon-[material-symbols--help-outline] text-base-content/50" />
            Other applications: find in settings
          </a>
        </li>
        <li>Paste the link and click Add.</li>
      </ul>
      <div className="-m-4">
        <Calendar
          urls={
            calendarURL ? [{ url: calendarURL, eventGroup: eventGroup }] : []
          }
          viewStorageId="popup"
        />
      </div>
    </Modal>
  );
}

const modalText: Record<
  TargetForExport,
  { title: string; description: string }
> = {
  [TargetForExport.music_room]: {
    title: "Export music room bookings",
    description:
      "You can add your personal music room schedule to your favorite\n" +
      "                  calendar application and it will be updated on changes.",
  },
  [TargetForExport.sport]: {
    title: "Export sport trainings",
    description:
      "You can add your personal sport trainings schedule to your\n" +
      "                  favorite calendar application and it will be updated on\n" +
      "                  changes.",
  },
  [TargetForExport.moodle]: {
    title: "Export Moodle deadlines",
    description:
      "You can add deadlines from your Moodle courses to your favorite calendar application and it will be updated on changes.",
  },
  [TargetForExport.room_bookings]: {
    title: "Export room bookings",
    description:
      "You can add your room bookings to your favorite\n" +
      "                  calendar application and it will be updated on changes.",
  },
  [TargetForExport.workshops]: {
    title: "Export to your calendar",
    description:
      "You can add the schedule to your favorite calendar application\n" +
      "                  and it will be updated on schedule changes.",
  },
};
