import type { searchTypes } from "@/api/search";
import { Modal } from "@/components/common/Modal";
import { Trans } from "@lingui/react/macro";
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
        fallback={
          <div
            role="status"
            className="flex h-[50vh] w-full flex-col items-center justify-center gap-3 rounded-xl"
          >
            <span className="loading loading-spinner loading-lg text-primary" />
            <span className="text-base-content/70 text-sm">
              <Trans>Loading...</Trans>
            </span>
          </div>
        }
      >
        <IframePreviewCard source={source} onClose={onClose} />
      </Suspense>
    </Modal>
  );
}
