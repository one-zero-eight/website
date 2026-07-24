import { useState } from "react";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

export function PlayerActionMenu({
  player,
}: {
  player: SchemaPlayer & { is_active: boolean };
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { mutate, isPending } = $tabletennis.useMutation("post", "/set-status");

  function handleConfirm() {
    mutate(
      {
        params: {
          query: {
            innohassle_id: player.innohassle_id,
            status:
              "advanced" as tabletennisTypes.PathsSetStatusPostParametersQueryStatus,
          },
        },
      },
      {
        onSuccess: () => {
          showSuccess("Status updated", `${player.nickname} is now advanced`);
          queryClient.invalidateQueries({
            queryKey: $tabletennis.queryOptions("get", "/players").queryKey,
          });
          setConfirmOpen(false);
        },
        onError: (error) => {
          if (isApiHttpError(error) && error.httpCode === 403) {
            showError(
              "Access denied",
              "Only administrators can change player status",
            );
          } else {
            showError("Error", formatApiErrorMessage(error));
          }
        },
      },
    );
  }

  const canUpgrade =
    player.status.toLowerCase() === "beginner" ||
    player.status.toLowerCase() === "";

  return (
    <>
      <div className="dropdown dropdown-end">
        <button type="button" tabIndex={0} className="btn btn-ghost btn-xs">
          <span className="icon-[material-symbols--more-vert]" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-2 shadow-sm"
        >
          {canUpgrade ? (
            <li>
              <button type="button" onClick={() => setConfirmOpen(true)}>
                <span className="icon-[material-symbols--upgrade] text-primary" />
                Upgrade to Advanced
              </button>
            </li>
          ) : (
            <li className="disabled">
              <span className="text-base-content/50">
                Already {player.status.toLowerCase()}
              </span>
            </li>
          )}
        </ul>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm status change"
      >
        <p className="text-base-content/80">
          Are you sure you want to upgrade <strong>{player.nickname}</strong>{" "}
          status to <strong>advanced</strong>?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}
