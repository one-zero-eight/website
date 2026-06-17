const STORAGE_PREFIX = "when2meet-setup-slots-";
const PENDING_PREFIX = "when2meet-pending-setup-";

export function getStoredAllowedSlots(meetingId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = sessionStorage.getItem(`${STORAGE_PREFIX}${meetingId}`);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as string[];
    return new Set(parsed);
  } catch {
    return null;
  }
}

export function storeAllowedSlots(meetingId: string, slotKeys: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    `${STORAGE_PREFIX}${meetingId}`,
    JSON.stringify(slotKeys),
  );
}

export function clearStoredAllowedSlots(meetingId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(`${STORAGE_PREFIX}${meetingId}`);
}

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
