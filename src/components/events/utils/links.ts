const workshopsApiUrl = import.meta.env.VITE_WORKSHOPS_API_URL;

export function getEventsIcsUrl() {
  return `${workshopsApiUrl}/events.ics`;
}

export function getMyEventsIcsUrl() {
  return `${workshopsApiUrl}/users/me/events.ics`;
}

export function getEventImageUrl(id: string) {
  return `${workshopsApiUrl}/events/${id}/image`;
}

export function getDraftImageUrl(id: string) {
  return `${workshopsApiUrl}/drafts/${id}/image`;
}

export function getSubmissionImageUrl(id: string) {
  return `${workshopsApiUrl}/submissions/${id}/image`;
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
