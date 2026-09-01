import { $schedule } from "@/api/schedule";
import { ReactElement } from "react";

export type AcademicCalendar = {
  groupPrefix: string;
  startDate: string; // Monday, first day of first week. Used for academic week calculations.
  endDate: string; // Monday, the day after the last week. Used for academic week calculations.
  Title: () => ReactElement;
  Details: () => ReactElement;
};

// prettier-ignore
export const academicCalendar: AcademicCalendar[] = [{
    groupPrefix: "B24",
    startDate: "2026-08-24",
    endDate: "2026-12-24",
    Title: () => <p>[B24] Semester F26: <span className="font-normal">August 24 - December 24</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> December 8 - December 24</p>
      <p><span className="font-semibold">Winter break:</span> December 25 - January 17</p>
    </>,
},

{
    groupPrefix: "B24-AI360",
    startDate: "2026-08-24",
    endDate: "2026-12-25",
    Title: () => <p>[B24-AI360] Semester F26: <span className="font-normal">August 24 - December 25</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> December 8 - December 25</p>
      <p><span className="font-semibold">Winter break:</span> December 26 - January 17</p>
    </>,
},
  {
    groupPrefix: "B25-AI360",
    startDate: "2026-08-31",
    endDate: "2026-12-27",
    Title: () => <p>[B25-AI360] Semester F26: <span className="font-normal">August 31 - December 27</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> December 15 - December 27</p>
      <p><span className="font-semibold">Winter break:</span> December 28 - January 17</p>
    </>,
}, {
    groupPrefix: "B25",
    startDate: "2026-08-31",
    endDate: "2026-12-26",
    Title: () => <p>[B25] Semester F26: <span className="font-normal">August 31 - December 26</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> December 15 - December 26</p>
      <p><span className="font-semibold">Winter break:</span> December 27 - January 17</p>
    </>,
},
  {
      groupPrefix: "B26",
      startDate: "2026-09-01",
      endDate: "2026-12-26",
      Title: () => <p>[B26] Semester F26: <span className="font-normal">September 01 - December 26</span></p>,
      Details: () => <>
        <p><span className="font-semibold">Exams:</span> December 14 - December 26</p>
        <p><span className="font-semibold">Winter break:</span> December 27 - January 17</p>
      </>,
  },
  {
      groupPrefix: "B26-AI360",
      startDate: "2026-09-01",
      endDate: "2027-01-11",
      Title: () => <p>[B26-AI360] Semester F26: <span className="font-normal">September 01 - January 11</span></p>,
      Details: () => <>
        <p><span className="font-semibold">Exams:</span> December 16 - January 10</p>
        <p><span className="font-semibold">Winter break:</span> January 11 - January 18</p>
      </>,
  },

  {
      groupPrefix: "M26",
      startDate: "2026-09-01",
      endDate: "2026-12-26",
      Title: () => <p>[M26] Semester F26: <span className="font-normal">September 01 - December 26</span></p>,
      Details: () => <>
        <p><span className="font-semibold">Exams:</span> December 16 - December 26</p>
        <p><span className="font-semibold">Winter break:</span> December 27 - January 17</p>
      </>,
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
