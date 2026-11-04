import { $schedule } from "@/api/schedule";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { ReactElement } from "react";

export type AcademicCalendar = {
  groupPrefix: string;
  startDate: string; // Monday, first day of first week. Used for academic week calculations.
  endDate: string; // Monday, the day after the last week. Used for academic week calculations.
  Title: () => ReactElement;
  Details: () => ReactElement;
};

function formatDay(isoDate: string, locale: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const tag = locale === "ru" ? "ru-RU" : "en-US";
  return new Date(year, month - 1, day).toLocaleDateString(tag, {
    month: "long",
    day: "numeric",
  });
}

function formatDateRange(startIso: string, endIso: string, locale: string) {
  return `${formatDay(startIso, locale)} - ${formatDay(endIso, locale)}`;
}

function AcademicCalendarTitle({
  group,
  semester,
  start,
  end,
}: {
  group: string;
  semester: string;
  start: string;
  end: string;
}) {
  const { i18n } = useLingui();
  const range = formatDateRange(start, end, i18n.locale);

  return (
    <p>
      <Trans>
        [{group}] Semester {semester}:{" "}
        <span className="font-normal">{range}</span>
      </Trans>
    </p>
  );
}

function AcademicCalendarDetails({
  examsStart,
  examsEnd,
  breakStart,
  breakEnd,
}: {
  examsStart: string;
  examsEnd: string;
  breakStart: string;
  breakEnd: string;
}) {
  const { i18n } = useLingui();
  const examDates = formatDateRange(examsStart, examsEnd, i18n.locale);
  const breakDates = formatDateRange(breakStart, breakEnd, i18n.locale);

  return (
    <>
      <p>
        <Trans>
          <span className="font-semibold">Exams:</span> {examDates}
        </Trans>
      </p>
      <p>
        <Trans>
          <span className="font-semibold">Winter break:</span> {breakDates}
        </Trans>
      </p>
    </>
  );
}

// prettier-ignore
export const academicCalendar: AcademicCalendar[] = [{
    groupPrefix: "B24",
    startDate: "2026-08-24",
    endDate: "2026-12-24",
    Title: () => (
      <AcademicCalendarTitle group="B24" semester="F26" start="2026-08-24" end="2026-12-24" />
    ),
    Details: () => (
      <AcademicCalendarDetails examsStart="2026-12-08" examsEnd="2026-12-24" breakStart="2026-12-25" breakEnd="2027-01-17" />
    ),
},

{
    groupPrefix: "B24-AI360",
    startDate: "2026-08-24",
    endDate: "2026-12-25",
    Title: () => (
      <AcademicCalendarTitle group="B24-AI360" semester="F26" start="2026-08-24" end="2026-12-25" />
    ),
    Details: () => (
      <AcademicCalendarDetails examsStart="2026-12-08" examsEnd="2026-12-25" breakStart="2026-12-26" breakEnd="2027-01-17" />
    ),
},
  {
    groupPrefix: "B25-AI360",
    startDate: "2026-08-31",
    endDate: "2026-12-27",
    Title: () => (
      <AcademicCalendarTitle group="B25-AI360" semester="F26" start="2026-08-31" end="2026-12-27" />
    ),
    Details: () => (
      <AcademicCalendarDetails examsStart="2026-12-15" examsEnd="2026-12-27" breakStart="2026-12-28" breakEnd="2027-01-17" />
    ),
}, {
    groupPrefix: "B25",
    startDate: "2026-08-31",
    endDate: "2026-12-26",
    Title: () => (
      <AcademicCalendarTitle group="B25" semester="F26" start="2026-08-31" end="2026-12-26" />
    ),
    Details: () => (
      <AcademicCalendarDetails examsStart="2026-12-15" examsEnd="2026-12-26" breakStart="2026-12-27" breakEnd="2027-01-17" />
    ),
},
  {
      groupPrefix: "B26",
      startDate: "2026-09-01",
      endDate: "2026-12-26",
      Title: () => (
        <AcademicCalendarTitle group="B26" semester="F26" start="2026-09-01" end="2026-12-26" />
      ),
      Details: () => (
        <AcademicCalendarDetails examsStart="2026-12-14" examsEnd="2026-12-26" breakStart="2026-12-27" breakEnd="2027-01-17" />
      ),
  },
  {
      groupPrefix: "B26-AI360",
      startDate: "2026-09-01",
      endDate: "2027-01-11",
      Title: () => (
        <AcademicCalendarTitle group="B26-AI360" semester="F26" start="2026-09-01" end="2027-01-11" />
      ),
      Details: () => (
        <AcademicCalendarDetails examsStart="2026-12-16" examsEnd="2027-01-10" breakStart="2027-01-11" breakEnd="2027-01-18" />
      ),
  },

  {
      groupPrefix: "M26",
      startDate: "2026-09-01",
      endDate: "2026-12-26",
      Title: () => (
        <AcademicCalendarTitle group="M26" semester="F26" start="2026-09-01" end="2026-12-26" />
      ),
      Details: () => (
        <AcademicCalendarDetails examsStart="2026-12-16" examsEnd="2026-12-26" breakStart="2026-12-27" breakEnd="2027-01-17" />
      ),
    },

];

export function findAcademicCalendarByGroups(
  groups: string[],
): AcademicCalendar | undefined {
  return academicCalendar.find((calendar) =>
    groups.some((group) => group.startsWith(calendar.groupPrefix)),
  );
}

export function useMyAcademicCalendar() {
  const { data: eventGroups, isPending: isPending1 } = $schedule.useQuery(
    "get",
    "/event-groups/",
  );
  const { data: predefined, isPending: isPending2 } = $schedule.useQuery(
    "get",
    "/users/me/predefined",
  );

  const groups = predefined?.event_groups
    ?.map(
      (alias) =>
        eventGroups?.event_groups.find((group) => group.alias === alias)?.name,
    )
    ?.filter((v) => v) as string[];
  const academicCalendar = findAcademicCalendarByGroups(groups || []);

  return { academicCalendar, isPending: isPending1 || isPending2 };
}
