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
    groupPrefix: "B23",
    startDate: "2026-01-19",
    endDate: "2026-05-25",
    Title: () => <p>[B23] Semester S26: <span className="font-normal">January 19 - May 23</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 7 - May 23</p>
    </>,
}, {
    groupPrefix: "B24",
    startDate: "2026-01-19",
    endDate: "2026-05-25",
    Title: () => <p>[B24] Semester S26: <span className="font-normal">January 19 - May 23</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 7 - May 23</p>
      <p><span className="font-semibold">Spring break:</span> May 24 - May 31</p>
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
    startDate: "2026-01-19",
    endDate: "2026-05-25",
    Title: () => <p>[B25] Semester S26: <span className="font-normal">January 19 - May 24</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 7 - May 24</p>
      <p><span className="font-semibold">Spring break:</span> May 25 - May 31</p>
    </>,
},{
    groupPrefix: "M25",
    startDate: "2026-01-19",
    endDate: "2026-05-25",
    Title: () => <p>[M25] Semester S26: <span className="font-normal">January 19 - May 24</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 7 - May 24</p>
      <p><span className="font-semibold">Spring break:</span> May 25 - May 31</p>
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
