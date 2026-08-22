import Tooltip from "@/components/common/Tooltip.tsx";
import { useState } from "react";
import { ImportModal } from "@/components/calendar/import";
import { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";

export default function EditButtonLinked({
  linkedCalendar,
}: {
  linkedCalendar: SchemaLinkedCalendarView;
}) {
  const [importModalOpen, setImportModalOpen] = useState(false);

  if (!linkedCalendar.alias) return null;

  return (
    <>
      <Tooltip content={"Edit this calendar"}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setImportModalOpen(true);
          }}
          className="hover:bg-base-200 rounded-box flex h-10 w-10 items-center justify-center text-3xl"
        >
          <span className="icon-[mdi--pencil] mb-1 h-8 w-8 text-green-500" />
        </button>
      </Tooltip>
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSubmit={() => setImportModalOpen(false)}
        prevCalendar={linkedCalendar}
        aboveModal
      />
    </>
  );
}
