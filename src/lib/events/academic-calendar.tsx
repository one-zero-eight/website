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
    startDate: "2025-08-25",
    endDate: "2025-12-29",
    Title: () => <p>[B23] Semester F25: <span className="font-normal">August 25 - December 25</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 9 - Dec 25</p>
      <p><span className="font-semibold">Winter break:</span> Dec 26 - Jan 18</p>
    </>,
}, {
    groupPrefix: "B24",
    startDate: "2025-08-25",
    endDate: "2025-12-29",
    Title: () => <p>[B24] Semester F25: <span className="font-normal">August 25 - December 24</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 9 - Dec 24</p>
      <p><span className="font-semibold">Winter break:</span> Dec 26 - Jan 18</p>
    </>,
}, {
    groupPrefix: "B25-AI360",
    startDate: "2025-09-01",
    endDate: "2025-12-29",
    Title: () => <p>[B25-AI360] Semester F25: <span className="font-normal">September 1 - January 11</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 16 - Jan 11</p>
      <p><span className="font-semibold">Winter break:</span> Jan 1 - Jan 8, Jan 12 - Jan 18</p>
    </>,
}, {
    groupPrefix: "B25",
    startDate: "2025-09-01",
    endDate: "2025-12-29",
    Title: () => <p>[B25] Semester F25: <span className="font-normal">September 1 - December 27</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 16 - Dec 27</p>
      <p><span className="font-semibold">Winter break:</span> Dec 28 - Jan 18</p>
    </>,
},{
    groupPrefix: "M25",
    startDate: "2025-09-01",
    endDate: "2025-12-29",
    Title: () => <p>[M25] Semester F25: <span className="font-normal">September 1 - December 27</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 16 - Dec 27</p>
      <p><span className="font-semibold">Winter break:</span> Dec 28 - Jan 18</p>
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
