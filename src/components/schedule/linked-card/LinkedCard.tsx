import RemoveButtonLinked from "@/components/schedule/linked-card/RemoveButtonLinked.tsx";
import HideButtonLinked from "@/components/schedule/linked-card/HideButtonLinked.tsx";
import EditButtonLinked from "@/components/schedule/linked-card/EditButtonLinked.tsx";
import { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";

export function LinkedCard({
  linkedCalendar,
}: {
  linkedCalendar: SchemaLinkedCalendarView | null;
}) {
  if (!linkedCalendar?.alias) return null;

  return (
    <div className="bg-base-200 hover:bg-base-300 rounded-box flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{linkedCalendar.name}</p>
        <p className="text-base-content/30">{linkedCalendar.description}</p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        <EditButtonLinked linkedCalendar={linkedCalendar} />
        <HideButtonLinked alias={linkedCalendar.alias} />
        <RemoveButtonLinked linkedCalendar={linkedCalendar} />
      </div>
    </div>
  );
}
