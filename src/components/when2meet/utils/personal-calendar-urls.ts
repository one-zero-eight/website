import type { scheduleTypes } from "@/api/schedule";
import {
  getICSLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMyRoomBookingsLink,
  getMySportLink,
  getMyWorkshopsLink,
} from "@/api/schedule/links.ts";

export function getPersonalCalendarIcsUrls({
  favorites,
  hidden,
  predefined,
  eventGroups,
  userId,
  musicRoomHidden,
  sportsHidden,
  moodleHidden,
}: {
  favorites: number[];
  hidden: number[];
  predefined: number[];
  eventGroups: scheduleTypes.SchemaListEventGroupsResponse;
  userId: number | undefined;
  musicRoomHidden: boolean;
  sportsHidden: boolean;
  moodleHidden: boolean;
}) {
  const urls: string[] = favorites.concat(predefined).flatMap((groupId) => {
    if (hidden.includes(groupId)) {
      return [];
    }

    const group = eventGroups.event_groups.find((item) => item.id === groupId);

    if (!group) {
      return [];
    }

    return [getICSLink(group.alias, userId)];
  });

  if (!musicRoomHidden) {
    urls.push(getMyMusicRoomLink());
  }

  if (!sportsHidden) {
    urls.push(getMySportLink());
  }

  if (!moodleHidden) {
    urls.push(getMyMoodleLink());
  }

  urls.push(getMyWorkshopsLink());
  urls.push(getMyRoomBookingsLink());

  return [...new Set(urls)];
}
