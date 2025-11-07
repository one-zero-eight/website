import { $events, eventsTypes } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { URLType } from "@/components/calendar/CalendarViewer.tsx";
import {
  getICSLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMySportLink,
  getMyWorkshopsLink,
} from "@/api/events/links.ts";
import { useRef } from "react";

export function CalendarPage() {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: eventGroups } = $events.useQuery("get", "/event-groups/");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");

  const initialWidth = useRef(window.innerWidth);

  return (
    <div className="grow overflow-hidden">
      <Calendar
        urls={
          eventsUser?.favorite_event_groups === undefined ||
          eventsUser?.hidden_event_groups === undefined ||
          predefined === undefined ||
          eventGroups === undefined
            ? []
            : getCalendarsToShow(
                eventsUser.favorite_event_groups,
                eventsUser.hidden_event_groups,
                predefined.event_groups,
                eventGroups,
                eventsUser.id,
                eventsUser.music_room_hidden,
                eventsUser.sports_hidden,
                eventsUser.moodle_hidden,
              )
        }
        initialView={
          initialWidth.current
            ? initialWidth.current >= 1280
              ? "dayGridMonth"
              : initialWidth.current >= 1024
                ? "timeGridWeek"
                : "listMonth"
            : "dayGridMonth"
        }
        viewId="page"
        isFullPage={true}
      />
    </div>
  );
}

function getCalendarsToShow(
  favorites: number[],
  hidden: number[],
  predefined: number[],
  eventGroups: eventsTypes.SchemaListEventGroupsResponse,
  userId: number | undefined,
  music_room_hidden: boolean,
  sports_hidden: boolean,
  moodle_hidden: boolean,
): URLType[] {
  // Remove hidden calendars
  const toShow: URLType[] = favorites.concat(predefined).flatMap((v) => {
    if (hidden.includes(v)) return [];
    const group = eventGroups.event_groups.find((group) => group.id === v);
    if (!group) return [];
    return [{ url: getICSLink(group.alias, userId), eventGroup: group }];
  });

  // Add personal calendars
  if (!music_room_hidden) {
    toShow.push({
      url: getMyMusicRoomLink(),
      color: "seagreen",
      sourceLink: "https://t.me/InnoMusicRoomBot",
      updatedAt: new Date().toISOString(),
    });
  }

  if (!sports_hidden) {
    toShow.push({
      url: getMySportLink(),
      color: "seagreen",
      sourceLink: "https://sport.innopolis.university",
      updatedAt: new Date().toISOString(),
    });
  }

  if (!moodle_hidden) {
    toShow.push({
      url: getMyMoodleLink(),
      color: "seagreen",
      sourceLink:
        "https://moodle.innopolis.university/calendar/view.php?view=month",
      updatedAt: new Date().toISOString(),
    });
  }

  toShow.push({
    url: getMyWorkshopsLink(),
    color: "seagreen",
    sourceLink: "https://innohassle.ru/events",
    updatedAt: new Date().toISOString(),
  });

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
