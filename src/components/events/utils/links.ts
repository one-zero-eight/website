const eventsApiUrl = import.meta.env.VITE_EVENTS_API_URL;

export function getLinkDisplayLabel(link: {
  url: string;
  name?: string | null;
}) {
  const name = link.name?.trim();
  if (name) {
    return name;
  }

  try {
    return new URL(link.url).host || link.url;
  } catch {
    return link.url;
  }
}

export function getEventsIcsUrl() {
  return `${eventsApiUrl}/events.ics`;
}

export function getEventImageUrl(id: string) {
  return `${eventsApiUrl}/events/${id}/image`;
}

export function getDraftImageUrl(id: string) {
  return `${eventsApiUrl}/drafts/${id}/image`;
}

export function getSubmissionImageUrl(id: string) {
  return `${eventsApiUrl}/submissions/${id}/image`;
}

export function extractEventIdFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\/events\/p\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    const match = url.match(/\/events\/p\/([^/?#]+)/);
    return match?.[1] ?? null;
  }
}
