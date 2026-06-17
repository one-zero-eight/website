export type LocalWhen2MeetEvent = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  role: "owner" | "participant";
  participantsCount?: number;
};

const STORAGE_KEY = "when2meet-local-events";

function readEvents() {
  if (typeof window === "undefined") {
    return [] as LocalWhen2MeetEvent[];
  }

  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [] as LocalWhen2MeetEvent[];
  }

  try {
    return JSON.parse(rawValue) as LocalWhen2MeetEvent[];
  } catch {
    return [] as LocalWhen2MeetEvent[];
  }
}

function writeEvents(events: LocalWhen2MeetEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getLocalEvents() {
  return readEvents();
}

export function getOwnedEvents() {
  return readEvents().filter((event) => event.role === "owner");
}

export function getParticipatingEvents() {
  return readEvents().filter((event) => event.role === "participant");
}

export function upsertLocalEvent(event: LocalWhen2MeetEvent) {
  const events = readEvents();
  const existingIndex = events.findIndex((entry) => entry.id === event.id);

  if (existingIndex === -1) {
    writeEvents([event, ...events]);
    return;
  }

  const existing = events[existingIndex];

  events[existingIndex] = {
    ...existing,
    ...event,
    role:
      existing.role === "owner" || event.role === "owner"
        ? "owner"
        : event.role,
  };

  writeEvents(events);
}

export function trackCreatedEvent({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description?: string | null;
}) {
  upsertLocalEvent({
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
    role: "owner",
    participantsCount: 0,
  });
}

export function trackParticipation({
  id,
  name,
  description,
  participantsCount,
}: {
  id: string;
  name: string;
  description?: string | null;
  participantsCount?: number;
}) {
  upsertLocalEvent({
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
    role: "participant",
    participantsCount,
  });
}

export function updateLocalEventStats(
  id: string,
  stats: {
    name?: string;
    description?: string | null;
    participantsCount?: number;
  },
) {
  const events = readEvents();
  const existingIndex = events.findIndex((entry) => entry.id === id);

  if (existingIndex === -1) {
    return;
  }

  events[existingIndex] = {
    ...events[existingIndex],
    ...stats,
  };

  writeEvents(events);
}

export function getLocalEventRole(id: string) {
  return readEvents().find((entry) => entry.id === id)?.role ?? null;
}

export function removeLocalEvent(id: string) {
  writeEvents(readEvents().filter((entry) => entry.id !== id));
}
