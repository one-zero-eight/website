const PENDING_PREFIX = "when2meet-pending-setup-";
const PREFILL_PREFIX = "when2meet-setup-prefill-";

export function markPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(`${PENDING_PREFIX}${meetingId}`, "1");
}

export function saveSetupSlotPrefill(meetingId: string, slotKeys: string[]) {
  if (typeof window === "undefined" || slotKeys.length === 0) {
    return;
  }

  sessionStorage.setItem(
    `${PREFILL_PREFIX}${meetingId}`,
    JSON.stringify(slotKeys),
  );
}

export function consumeSetupSlotPrefill(meetingId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = sessionStorage.getItem(`${PREFILL_PREFIX}${meetingId}`);

  if (!raw) {
    return [];
  }

  sessionStorage.removeItem(`${PREFILL_PREFIX}${meetingId}`);

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value) => typeof value === "string");
  } catch {
    return [];
  }
}

export function clearPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(`${PENDING_PREFIX}${meetingId}`);
  sessionStorage.removeItem(`${PREFILL_PREFIX}${meetingId}`);
}

export function isPendingSetup(meetingId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(`${PENDING_PREFIX}${meetingId}`) === "1";
}
