import {
  RestoreBodyFrom,
  RestoreSource,
  SchemaRestoreSourceItem,
} from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import moment from "moment";

function entityLabel(entity: RestoreSource) {
  if (entity === RestoreSource.submission) {
    return "Submission";
  }
  if (entity === RestoreSource.public) {
    return "Public";
  }
  return entity;
}

export function RestoreDraftModal({
  open,
  onOpenChange,
  sources,
  isPending,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: SchemaRestoreSourceItem[];
  isPending: boolean;
  onRestore: (from: RestoreBodyFrom) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Restore draft">
      <div className="@container/modal flex flex-col gap-3">
        <p className="text-base-content/70 text-sm">
          Choose a source to restore the draft from.
        </p>
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <li key={`${source.entity}-${source.revision}`}>
              <button
                type="button"
                className="border-base-300 hover:border-primary/40 flex w-full flex-col gap-0.5 rounded-xl border px-4 py-3 text-left"
                disabled={isPending}
                onClick={() =>
                  onRestore(
                    source.entity === RestoreSource.public
                      ? RestoreBodyFrom.public
                      : RestoreBodyFrom.submission,
                  )
                }
              >
                <span className="font-medium">
                  {entityLabel(source.entity)}
                </span>
                <span className="text-base-content/70 text-sm">
                  {moment(source.revision).format("D MMM YYYY, HH:mm")} ·{" "}
                  {moment(source.revision).fromNow()}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
