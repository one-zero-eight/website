export const EVENTS_API_URL = process.env.NEXT_PUBLIC_EVENTS_API_URL!;

export function getICSLink(group_alias: string) {
  return `${EVENTS_API_URL}/event-groups/ics/${group_alias}.ics`;
}
