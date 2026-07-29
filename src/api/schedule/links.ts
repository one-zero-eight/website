export const SCHEDULE_API_URL = import.meta.env.VITE_SCHEDULE_API_URL!;
export const WORKSHOPS_API_URL = import.meta.env.VITE_WORKSHOPS_API_URL!;

export const CALENDAR_EXPORT_HOST = "api.inh.dofi4ka.ru";

export function rewriteCalendarExportHost(url: string) {
  const parsed = new URL(url);
  parsed.host = CALENDAR_EXPORT_HOST;
  return parsed.toString();
}

export function getICSLink(
  groupAlias: string,
  userId: number | undefined,
  exportType: string | "web" | "url" = "web",
) {
  return rewriteCalendarExportHost(
    `${SCHEDULE_API_URL}/${groupAlias}.ics?user_id=${
      userId || 0
    }&export_type=${exportType}`,
  );
}

export function getMusicRoomLink() {
  return rewriteCalendarExportHost(`${SCHEDULE_API_URL}/music-room.ics`);
}

export function getWorkshopsLink() {
  return rewriteCalendarExportHost(`${SCHEDULE_API_URL}/workshops.ics`);
}

export function getMyMusicRoomLink() {
  return rewriteCalendarExportHost(
    `${SCHEDULE_API_URL}/users/me/music-room.ics`,
  );
}

export function getMySportLink() {
  return rewriteCalendarExportHost(`${SCHEDULE_API_URL}/users/me/sport.ics`);
}

export function getMyMoodleLink() {
  return rewriteCalendarExportHost(`${SCHEDULE_API_URL}/users/me/moodle.ics`);
}

export function getMyWorkshopsLink() {
  return rewriteCalendarExportHost(`${WORKSHOPS_API_URL}/users/me/events.ics`);
}

export function getMyRoomBookingsLink() {
  return rewriteCalendarExportHost(
    `${SCHEDULE_API_URL}/users/me/room-bookings.ics`,
  );
}

export function getPersonalLink(resourcePath: string, accessKey: string) {
  return rewriteCalendarExportHost(
    `${SCHEDULE_API_URL}${resourcePath}?access_key=${accessKey}`,
  );
}

export function getImportedLink(
  userId: number | undefined,
  linkedAlias: string,
) {
  return `${SCHEDULE_API_URL}/users/${userId}/linked/${linkedAlias}.ics`;
}
