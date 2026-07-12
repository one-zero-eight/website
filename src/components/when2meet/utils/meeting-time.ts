export type MeetingTimeRange = {
  start: string;
  end: string;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getDateId(date: Date) {
  return date.toLocaleDateString("en-CA");
}

export function formatMeetingTimeRange(meetingTime?: MeetingTimeRange | null) {
  if (!meetingTime) {
    return null;
  }

  const start = new Date(meetingTime.start);
  const end = new Date(meetingTime.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const startDate = dateFormatter.format(start);
  const startTime = timeFormatter.format(start);
  const endTime = timeFormatter.format(end);

  if (getDateId(start) === getDateId(end)) {
    return `${startDate}, ${startTime} - ${endTime}`;
  }

  return `${startDate}, ${startTime} - ${dateFormatter.format(end)}, ${endTime}`;
}
