export const SCHEDULE_API_URL = import.meta.env.VITE_SCHEDULE_API_URL!;
export const WORKSHOPS_API_URL = import.meta.env.VITE_WORKSHOPS_API_URL!;

export function getICSLink(
  groupAlias: string,
  userId: number | undefined,
  exportType: string | "web" | "url" = "web",
) {
  return `${SCHEDULE_API_URL}/${groupAlias}.ics?user_id=${
    userId || 0
  }&export_type=${exportType}`;
}

export function getMusicRoomLink() {
  return `${SCHEDULE_API_URL}/music-room.ics`;
}

export function getWorkshopsLink() {
  return `${SCHEDULE_API_URL}/workshops.ics`;
}

export function getMyMusicRoomLink() {
  return `${SCHEDULE_API_URL}/users/me/music-room.ics`;
}

export function getMySportLink() {
  return `${SCHEDULE_API_URL}/users/me/sport.ics`;
}

export function getMyMoodleLink() {
  return `${SCHEDULE_API_URL}/users/me/moodle.ics`;
}

export function getMyWorkshopsLink() {
  return `${SCHEDULE_API_URL}/users/me/workshops.ics`;
}

export function getMyRoomBookingsLink() {
  return `${SCHEDULE_API_URL}/users/me/room-bookings.ics`;
}

export function getPersonalLink(resourcePath: string, accessKey: string) {
  return `${SCHEDULE_API_URL}${resourcePath}?access_key=${accessKey}`;
}
