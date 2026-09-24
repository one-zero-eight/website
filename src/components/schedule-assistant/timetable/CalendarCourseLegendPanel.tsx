import { cn } from "@/lib/ui/cn";

import type { CalendarCourseLegendRow } from "./calendarCourseLegend.ts";

export function CalendarCourseLegendPanel({
  rows,
  className,
}: {
  rows: CalendarCourseLegendRow[];
  className?: string;
}) {
  if (!rows.length) {
    return (
      <div
        className={cn(
          "bg-base-200/40 px-3 py-6 text-center text-sm",
          className,
        )}
      >
        Нет курсов для выбранной программы.
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="border-base-300 overflow-hidden border">
        <table className="table-xs table w-full">
          <thead className="bg-base-200 sticky top-0">
            <tr>
              <th className="whitespace-nowrap">Short name</th>
              <th>Course Name</th>
              <th>Instructor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.shortName}:${row.courseName}`}>
                <td className="font-medium whitespace-nowrap">
                  {row.shortName}
                </td>
                <td className="wrap-anywhere">{row.courseName}</td>
                <td className="wrap-anywhere">{row.instructor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
