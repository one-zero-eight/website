import { ReactElement } from "react";

export type AcademicCalendar = {
  groupPrefix: string;
  Title: () => ReactElement;
  Details: () => ReactElement;
};

// prettier-ignore
export const academicCalendar: AcademicCalendar[] = [{
    groupPrefix: "B21",
    Title: () => <p>[B21] Semester F24: <span className="font-normal">Aug 26 - Dec 21</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Winter break:</span> Dec 22 - Jan 12</p>
    </>,
}, {
    groupPrefix: "B22",
    Title: () => <p>[B22] Semester F24: <span className="font-normal">Aug 26 - Dec 20</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 10 - Dec 20</p>
      <p><span className="font-semibold">Winter break:</span> Dec 21 - Jan 19</p>
    </>,
}, {
    groupPrefix: "B23",
    Title: () => <p>[B23] Semester F24: <span className="font-normal">Aug 26 - Dec 23</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 10 - Dec 23</p>
      <p><span className="font-semibold">Winter break:</span> Dec 24 - Jan 19</p>
    </>,
}, {
    groupPrefix: "B24-AI360",
    Title: () => <p>[B24-AI360] Semester F24: <span className="font-normal">Aug 26 - Dec 28</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 10 - Dec 28</p>
      <p><span className="font-semibold">Winter break:</span> Dec 29 - Jan 19</p>
    </>,
}, {
    groupPrefix: "B24",
    Title: () => <p>[B24] Semester F24: <span className="font-normal">Aug 26 - Dec 22</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 10 - Dec 22</p>
      <p><span className="font-semibold">Winter break:</span> Dec 23 - Jan 19</p>
    </>,
}, {
    groupPrefix: "M24",
    Title: () => <p>[M24] Semester F24: <span className="font-normal">Aug 26 - Dec 22</span></p>,
    Details: () => <>
      <p><span className="font-semibold">Exams:</span> Dec 10 - Dec 22</p>
      <p><span className="font-semibold">Winter break:</span> Dec 23 - Jan 19</p>
    </>,
}];

export function findAcademicCalendarByGroups(
  groups: string[],
): AcademicCalendar | undefined {
  return academicCalendar.find((calendar) =>
    groups.some((group) => group.startsWith(calendar.groupPrefix)),
  );
}
