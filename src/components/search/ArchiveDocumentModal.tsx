import type { searchTypes } from "@/api/search";
import { Modal } from "@/components/common/Modal";
import { lazy, Suspense } from "react";

const IframePreviewCard = lazy(() => import("./IframePreviewCard"));

export function ArchiveDocumentModal({
  source,
  onClose,
}: {
  source: searchTypes.SchemaEduwikiSource;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      hideHeader
      containerClassName="max-w-5xl p-0"
    >
      <Suspense
        fallback={<div className="skeleton h-[50vh] w-full rounded-xl" />}
      >
        <IframePreviewCard source={source} onClose={onClose} />
      </Suspense>
    </Modal>
  );
}
