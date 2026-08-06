import Tooltip from "@/components/common/Tooltip.tsx";
import { useState } from "react";
import { ImportModal } from "@/components/calendar/import";

export default function EditButtonLinked({
  alias,
  name,
  description,
  url,
}: {
  alias: string | null | undefined;
  name: string | null | undefined;
  description: string | null | undefined;
  url: string | null | undefined;
}) {
  const [importModalOpen, setImportModalOpen] = useState(false);

  if (!alias || !name) return null;

  return (
    <>
      <Tooltip content={"Edit this calendar"}>
        <button
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
        prevAlias={alias}
        prevName={name}
        prevDescription={description}
        prevUrl={url}
        aboveModal
      />
    </>
  );
}
