import { ComponentProps, lazy, Suspense } from "react";

export const RoomCalendarViewer = lazy(
  () => import("./RoomCalendarViewer.tsx"),
);

export function RoomCalendar(props: ComponentProps<typeof RoomCalendarViewer>) {
  return (
    <Suspense>
      <RoomCalendarViewer {...props} />
    </Suspense>
  );
}
