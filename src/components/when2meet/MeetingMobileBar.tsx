import { cn } from "@/lib/ui/cn";
import { useState } from "react";
import { formatParticipantShortName } from "./utils/participants.ts";

export function MeetingMobileBar({
  onDelete,
  onSaveSetup,
  onClearSetup,
  onToggleAvailability,
  onClearAvailability,
  onCancelAvailability,
  isDeleting,
  isSavingSetup,
  isEditingAvailability,
  isSavingAvailability,
  canClearAvailability,
  canClearSetup,
  selectedSlotDetails,
}: {
  onDelete?: () => void;
  onSaveSetup?: () => void;
  onClearSetup?: () => void;
  onToggleAvailability?: () => void;
  onClearAvailability?: () => void;
  onCancelAvailability?: () => void;
  isDeleting?: boolean;
  isSavingSetup?: boolean;
  isEditingAvailability?: boolean;
  isSavingAvailability?: boolean;
  canClearAvailability?: boolean;
  canClearSetup?: boolean;
  selectedSlotDetails?: {
    label: string;
    unavailableMessage?: string;
    participantNames: string[];
  };
}) {
  const [expandedSlotLabel, setExpandedSlotLabel] = useState<string | null>(
    null,
  );
  const areParticipantsExpanded =
    expandedSlotLabel === selectedSlotDetails?.label;
  const hasPrimaryActions = Boolean(onDelete || onToggleAvailability);

  if (onSaveSetup) {
    return (
      <div className="border-base-300 bg-base-200 fixed bottom-12 flex h-fit w-full flex-col gap-2 rounded-t-xl border-b p-4 md:hidden">
        {onClearSetup && (
          <button
            type="button"
            className="btn btn-error w-full"
            disabled={!canClearSetup || isSavingSetup}
            onClick={onClearSetup}
          >
            Clear all
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary w-full gap-2"
          disabled={isSavingSetup}
          onClick={onSaveSetup}
        >
          {isSavingSetup ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Save timeslots"
          )}
        </button>
      </div>
    );
  }

  if (!onDelete && !onToggleAvailability && !selectedSlotDetails) {
    return null;
  }

  return (
    <div
      data-mobile-bar
      className={cn(
        "border-base-300 bg-base-200 fixed bottom-12 flex h-fit w-full flex-col gap-2 rounded-t-xl border-b px-4 md:hidden",
        selectedSlotDetails
          ? hasPrimaryActions
            ? "pt-3 pb-4"
            : "py-3"
          : "py-4",
      )}
    >
      {selectedSlotDetails && (
        <div data-selected-slot-details className="min-w-0 text-left text-sm">
          <div className="font-medium">{selectedSlotDetails.label}</div>
          {selectedSlotDetails.unavailableMessage ? (
            <div className="text-base-content/60 mt-1">
              {selectedSlotDetails.unavailableMessage}
            </div>
          ) : (
            <div className="mt-1 flex min-w-0 items-start gap-2">
              <div
                data-slot-participants
                className={cn(
                  "min-w-0 flex-1",
                  areParticipantsExpanded
                    ? "max-h-[min(35vh,12rem)] overflow-y-auto pr-1 break-words whitespace-normal"
                    : "truncate",
                )}
              >
                <span className="text-base-content/60">
                  {selectedSlotDetails.participantNames.length} available:{" "}
                </span>
                {selectedSlotDetails.participantNames
                  .map(formatParticipantShortName)
                  .join(", ")}
              </div>
              {selectedSlotDetails.participantNames.length > 1 && (
                <button
                  type="button"
                  className="btn btn-link h-auto min-h-0 shrink-0 p-0 text-xs"
                  onClick={() =>
                    setExpandedSlotLabel(
                      areParticipantsExpanded
                        ? null
                        : selectedSlotDetails.label,
                    )
                  }
                >
                  {areParticipantsExpanded ? "Hide all" : "Show all"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {hasPrimaryActions && (
        <div data-mobile-bar-actions className="flex flex-row gap-2">
          {onToggleAvailability && (
            <button
              type="button"
              className="btn btn-primary w-full min-w-0 gap-2"
              disabled={isSavingAvailability}
              onClick={onToggleAvailability}
            >
              {isSavingAvailability ? (
                <span className="loading loading-spinner loading-sm" />
              ) : isEditingAvailability ? (
                "Save timeslots"
              ) : (
                "Change my availability"
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn btn-outline btn-error btn-square shrink-0"
              disabled={isDeleting}
              onClick={onDelete}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <span className="icon-[material-symbols--delete-outline] text-xl" />
              )}
            </button>
          )}
        </div>
      )}
      {isEditingAvailability && (
        <div className="flex w-full flex-row gap-2">
          {onCancelAvailability && (
            <button
              type="button"
              className="btn btn-ghost flex-1"
              disabled={isSavingAvailability}
              onClick={onCancelAvailability}
            >
              Cancel
            </button>
          )}
          {onClearAvailability && (
            <button
              type="button"
              className="btn btn-error flex-1"
              disabled={!canClearAvailability || isSavingAvailability}
              onClick={onClearAvailability}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
