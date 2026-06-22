import { $events } from "@/api/events";
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
    startDate: "2026-06-01",
    endDate: "2026-07-30",
    Title: () => <p>[B24] Semester Sum26: <span className="font-normal">June 01 - July 30</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 21 - July 30</p>
      <p><span className="font-semibold">Summer break:</span> July 31 - August 23</p>
    </>,
}, {
    groupPrefix: "B25-AI360",
    startDate: "2026-01-19",
    endDate: "2026-06-29",
    Title: () => <p>[B25-AI360] Semester S26: <span className="font-normal">January 19 - June 28</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 29 - June 28</p>
      <p><span className="font-semibold">Summer break:</span> June 29 - August 30</p>
    </>,
}, {
    groupPrefix: "B25",
    startDate: "2026-06-01",
    endDate: "2026-08-02",
    Title: () => <p>[B25] Semester Sum26: <span className="font-normal">June 01 - August 02</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 21 - August 02</p>
      <p><span className="font-semibold">Summer break:</span> August 03 - August 30</p>
    </>,
},{
    groupPrefix: "M25",
    startDate: "2026-06-01",
    endDate: "2026-08-02",
    Title: () => <p>[M25] Semester Sum26: <span className="font-normal">June 01 - August 02</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 21 - August 02</p>
      <p><span className="font-semibold">Summer break:</span> August 03 - August 30</p>
    </>,
}];

export function findAcademicCalendarByGroups(
  groups: string[],
): AcademicCalendar | undefined {
  return academicCalendar.find((calendar) =>
    groups.some((group) => group.startsWith(calendar.groupPrefix)),
  );
}

export function useMyAcademicCalendar() {
  const { data: eventGroups, isPending: isPending1 } = $events.useQuery(
    "get",
    "/event-groups/",
  );
  const { data: predefined, isPending: isPending2 } = $events.useQuery(
    "get",
    "/users/me/predefined",
  );

  const groups = predefined?.event_groups
    ?.map((v) => eventGroups?.event_groups.find((g) => g.id === v)?.name)
    ?.filter((v) => v) as string[];
  const academicCalendar = findAcademicCalendarByGroups(groups || []);

  return { academicCalendar, isPending: isPending1 || isPending2 };
}
