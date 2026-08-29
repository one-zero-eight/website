import { useNavigate } from "@tanstack/react-router";
import RemoveButtonLinked from "@/components/schedule/linked-card/RemoveButtonLinked.tsx";
import HideButtonLinked from "@/components/schedule/linked-card/HideButtonLinked.tsx";
import EditButtonLinked from "@/components/schedule/linked-card/EditButtonLinked.tsx";
import type { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";

export type LinkedCardProps = {
  linkedCalendar: SchemaLinkedCalendarView | null;
  pageUrl?: string;
  canHide?: boolean;
};

export function LinkedCard({ linkedCalendar, pageUrl }: LinkedCardProps) {
  const navigate = useNavigate();
  if (!linkedCalendar) return null;

  const { alias, name, description } = linkedCalendar;

  return (
    <div
      className="bg-base-200 hover:bg-base-300 rounded-box flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between p-4"
      onClick={() => pageUrl && navigate({ to: pageUrl })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-base-content/30">{description}</p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        <EditButtonLinked linkedCalendar={linkedCalendar} />
        <HideButtonLinked alias={alias} />
        <RemoveButtonLinked alias={alias} calendarName={name ?? ""} />
      </div>
    </div>
  );
}
