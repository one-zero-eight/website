import { ReactElement } from "react";

export type AcademicCalendar = {
  groupPrefix: string;
  Title: () => ReactElement;
  Details: () => ReactElement;
};

// prettier-ignore
export const academicCalendar: AcademicCalendar[] = [{
    groupPrefix: "B21",
    Title: () => <p>[B21] Semester S25</p>,
    Details: () => <>
      <p><span className="font-semibold">Spring break:</span> May 25 - May 31</p>
      <p><span className="font-semibold">Thesis defense:</span> June 1 - July 13</p>
    </>,
}, {
    groupPrefix: "B22",
    Title: () => <p>[B22] Semester S25: <span className="font-normal">Jan 20 - May 16</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 8 - May 16</p>
      <p><span className="font-semibold">Spring break:</span> May 17 - May 25</p>
    </>,
}, {
    groupPrefix: "B23",
    Title: () => <p>[B23] Semester S25: <span className="font-normal">Jan 20 - May 22</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 8 - May 22</p>
      <p><span className="font-semibold">Spring break:</span> May 23 - June 1</p>
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
    Title: () => <p>[B24] Semester S25: <span className="font-normal">Jan 20 - May 22</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 8 - May 22</p>
      <p><span className="font-semibold">Spring break:</span> May 23 - June 1</p>
    </>,
}, {
    groupPrefix: "M24",
    Title: () => <p>[M24] Semester S25: <span className="font-normal">Jan 20 - May 22</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> May 8 - May 22</p>
      <p><span className="font-semibold">Spring break:</span> May 23 - June 1</p>
    </>,
}];

export function findAcademicCalendarByGroups(
  groups: string[],
): AcademicCalendar | undefined {
  return academicCalendar.find((calendar) =>
    groups.some((group) => group.startsWith(calendar.groupPrefix)),
  );
}
