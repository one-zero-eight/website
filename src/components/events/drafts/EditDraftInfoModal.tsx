import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { SchemaDraftOut } from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useEventsAuth } from "../hooks";
import {
  HostFields,
  HostFormValue,
  hostApiToForm,
  hostFormToApi,
} from "../shared/HostFields";
import {
  fromDatetimeLocalValue,
  isDatetimeLocalInPast,
  toDatetimeLocalValue,
} from "../utils/datetime";

export function EditDraftInfoModal({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: SchemaDraftOut;
}) {
  const { showError } = useToast();
  const queryClient = useQueryClient();
  const { clubs, isClubLeader, isEventManager } = useEventsAuth();

  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [host, setHost] = useState<HostFormValue>({ mode: "none" });

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt(toDatetimeLocalValue(draft.data.starts_at));
    setLocation(draft.data.location ?? "");
    setHost(
      hostApiToForm(draft.data.host, {
        canUseClub: isClubLeader,
        canUseExternal: isEventManager,
        defaultClubId: clubs[0]?.club_id,
      }),
    );
  }, [open, draft, isClubLeader, isEventManager, clubs]);

  const { mutate, isPending } = $workshops.useMutation(
    "patch",
    "/drafts/{id}",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/drafts/{id}", {
            params: { path: { id: draft.id } },
          }).queryKey,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    },
  );

  function handleSubmit() {
    if (startsAt && isDatetimeLocalInPast(startsAt)) {
      showError("Invalid date", "Start time cannot be in the past.");
      return;
    }

    mutate({
      params: { path: { id: draft.id } },
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        host: hostFormToApi(host),
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit info">
      <div className="@container/modal flex flex-col gap-4">
        <HostFields
          value={host}
          onChange={setHost}
          clubs={clubs}
          canUseClub={isClubLeader}
          canUseExternal={isEventManager}
          disabled={isPending}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span>Starts at</span>
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={startsAt}
            disabled={isPending}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Location</span>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="TBA"
            value={location}
            disabled={isPending}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
