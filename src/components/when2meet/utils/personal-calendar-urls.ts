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
  favorites: string[];
  hidden: string[];
  predefined: string[];
  eventGroups: scheduleTypes.SchemaListEventGroupsResponse;
  userId: number | undefined;
  musicRoomHidden: boolean;
  sportsHidden: boolean;
  moodleHidden: boolean;
}) {
  const urls: string[] = favorites.concat(predefined).flatMap((groupAlias) => {
    if (hidden.includes(groupAlias)) {
      return [];
    }

    const group = eventGroups.event_groups.find(
      (item) => item.alias === groupAlias,
    );

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
