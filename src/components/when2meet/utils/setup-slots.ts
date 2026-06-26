const PENDING_PREFIX = "when2meet-pending-setup-";

export function markPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(`${PENDING_PREFIX}${meetingId}`, "1");
}

export function clearPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(`${PENDING_PREFIX}${meetingId}`);
}

export function isPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(`${PENDING_PREFIX}${meetingId}`) === "1";
}
