import { ReactElement } from "react";

export type AcademicCalendar = {
  groupPrefix: string;
  Title: () => ReactElement;
  Details: () => ReactElement;
};

// prettier-ignore
export const academicCalendar: AcademicCalendar[] = [{
    groupPrefix: "B23",
    Title: () => <p>[B23] Semester Sum25: <span className="font-normal">June 2 - July 30</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 22 - July 30</p>
      <p><span className="font-semibold">Summer break:</span> July 31 - Aug 24</p>
    </>,
}, {
    groupPrefix: "B24-AI360",
    Title: () => <p>[B24-AI360] Semester S25: <span className="font-normal">Jan 20 - June 29</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 30 - June 29</p>
      <p><span className="font-semibold">Summer break:</span> June 30 - Aug 24</p>
    </>,
}, {
    groupPrefix: "B24",
    Title: () => <p>[B23] Semester Sum25: <span className="font-normal">June 2 - July 30</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 22 - July 30</p>
      <p><span className="font-semibold">Summer break:</span> July 31 - Aug 24</p>
    </>,
}, {
    groupPrefix: "M24",
    Title: () => <p>[M24] Semester Sum25: <span className="font-normal">May 26 - July 31</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> July 22 - July 31</p>
      <p><span className="font-semibold">Summer break:</span> Aug 1 - Aug 24</p>
    </>,
}];

export function findAcademicCalendarByGroups(
  groups: string[],
): AcademicCalendar | undefined {
  return academicCalendar.find((calendar) =>
    groups.some((group) => group.startsWith(calendar.groupPrefix)),
  );
}
