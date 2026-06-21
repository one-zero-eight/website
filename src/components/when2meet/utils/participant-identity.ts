const STORAGE_PREFIX = "when2meet-participant-name";

function storageKey(meetingId: string) {
  return `${STORAGE_PREFIX}:${meetingId}`;
}

export function getStoredParticipantName(meetingId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(storageKey(meetingId));
}

export function storeParticipantName(meetingId: string, name: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(storageKey(meetingId), name);
}
