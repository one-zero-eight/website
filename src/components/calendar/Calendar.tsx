import { ComponentProps, lazy, Suspense } from "react";

export const CalendarViewer = lazy(() => import("./CalendarViewer.tsx"));

export function Calendar(props: ComponentProps<typeof CalendarViewer>) {
  return (
    <Suspense>
      <CalendarViewer {...props} />
    </Suspense>
  );
}
