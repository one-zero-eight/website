export const EVENTS_API_URL = import.meta.env.VITE_EVENTS_API_URL!;

export function getICSLink(
  groupAlias: string,
  userId: number | undefined,
  exportType: string = "web",
) {
  return `${EVENTS_API_URL}/${groupAlias}.ics?user_id=${
    userId || 0
  }&export_type=${exportType}`;
}

export function getMusicRoomLink() {
  return `${EVENTS_API_URL}/music-room.ics`;
}

export function getMyMusicRoomLink() {
  return `${EVENTS_API_URL}/users/me/music-room.ics`;
}

export function getMySportLink() {
  return `${EVENTS_API_URL}/users/me/sport.ics`;
}

export function getMyMoodleLink() {
  return `${EVENTS_API_URL}/users/me/moodle.ics`;
}

export function getMyWorkshopsLink() {
  return `${EVENTS_API_URL}/users/me/workshops.ics`;
}

export function getPersonalLink(resourcePath: string, accessKey: string) {
  return `${EVENTS_API_URL}${resourcePath}?access_key=${accessKey}`;
}
