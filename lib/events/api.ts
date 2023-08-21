export const EVENTS_API_URL = process.env.NEXT_PUBLIC_EVENTS_API_URL!;

export function getICSLink(
  groupAlias: string,
  userId: number | undefined,
  exportType: string = "web",
) {
  return `${EVENTS_API_URL}/${groupAlias}.ics?user_id=${
    userId || 0
  }&export_type=${exportType}`;
}
