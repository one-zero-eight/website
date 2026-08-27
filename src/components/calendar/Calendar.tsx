import { lazy, Suspense } from "react";
import { ComponentProps } from "react";

export const CalendarViewer = lazy(() =>
  import("./CalendarViewer.tsx").then(({ CalendarViewer }) => ({
    default: CalendarViewer,
  })),
);

export function Calendar(props: ComponentProps<typeof CalendarViewer>) {
  return (
    <Suspense>
      <CalendarViewer {...props} />
    </Suspense>
  );
}
