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

/** RTTF: a starting rating is a multiple of 25 and at least 100 */
const MIN_START_RATING = 100;
const START_RATING_STEP = 25;

export function PlayerActionMenu({
  player,
}: {
  player: SchemaPlayer & { is_active: boolean };
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(MIN_START_RATING);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { mutate, isPending } = $tabletennis.useMutation("post", "/set-status");
  const { mutate: setRatingMutate, isPending: settingRating } =
    $tabletennis.useMutation("post", "/set-rating");

  function refreshPlayers() {
    queryClient.invalidateQueries({
      queryKey: $tabletennis.queryOptions("get", "/players").queryKey,
    });
  }

  function handleError(error: unknown, action: string) {
    if (isApiHttpError(error) && error.httpCode === 403) {
      showError("Access denied", `Only administrators can ${action}`);
    } else {
      showError("Error", formatApiErrorMessage(error as never));
    }
  }

  const currentStatus = player.status.toLowerCase();
  // beginner (or no status yet) can be upgraded, advanced can be downgraded back
  const targetStatus: "advanced" | "beginner" | null =
    currentStatus === "beginner" || currentStatus === ""
      ? "advanced"
      : currentStatus === "advanced"
        ? "beginner"
        : null;

  function handleConfirm() {
    if (!targetStatus) return;
    mutate(
      {
        params: {
          query: {
            innohassle_id: player.innohassle_id,
            status:
              targetStatus as tabletennisTypes.PathsSetStatusPostParametersQueryStatus,
          },
        },
      },
      {
        onSuccess: () => {
          showSuccess(
            "Status updated",
            `${player.nickname} is now ${targetStatus}`,
          );
          refreshPlayers();
          setConfirmOpen(false);
        },
        onError: (error) => handleError(error, "change player status"),
      },
    );
  }

  function openRating() {
    const current = Math.round(player.rating / START_RATING_STEP);
    setRating(Math.max(MIN_START_RATING, current * START_RATING_STEP));
    setRatingOpen(true);
  }

  function handleSetRating() {
    setRatingMutate(
      {
        params: { query: { innohassle_id: player.innohassle_id, rating } },
      },
      {
        onSuccess: () => {
          showSuccess("Rating updated", `${player.nickname}: ${rating}`);
          refreshPlayers();
          setRatingOpen(false);
        },
        onError: (error) => handleError(error, "change player rating"),
      },
    );
  }

  return (
    <>
      <div className="dropdown dropdown-end">
        <button type="button" tabIndex={0} className="btn btn-ghost btn-xs">
          <span className="icon-[material-symbols--more-vert]" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-200 rounded-box z-1 w-56 p-2 shadow-sm"
        >
          {targetStatus === "advanced" && (
            <li>
              <button type="button" onClick={() => setConfirmOpen(true)}>
                <span className="icon-[material-symbols--upgrade] text-primary" />
                Upgrade to Advanced
              </button>
            </li>
          )}
          {targetStatus === "beginner" && (
            <li>
              <button type="button" onClick={() => setConfirmOpen(true)}>
                <span className="icon-[material-symbols--upgrade] text-primary rotate-180" />
                Downgrade to Beginner
              </button>
            </li>
          )}
          {targetStatus === null && (
            <li className="disabled">
              <span className="text-base-content/50">
                Already {player.status.toLowerCase()}
              </span>
            </li>
          )}
          <li>
            <button type="button" onClick={openRating}>
              <span className="icon-[mdi--star-cog-outline] text-primary" />
              Set starting rating
            </button>
          </li>
        </ul>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm status change"
      >
        <p className="text-base-content/80">
          Are you sure you want to{" "}
          {targetStatus === "beginner" ? "downgrade" : "upgrade"}{" "}
          <strong>{player.nickname}</strong> to <strong>{targetStatus}</strong>?
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

      <Modal
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        title="Starting rating"
      >
        <p className="text-base-content/70 text-sm">
          RTTF: the organiser assigns a newcomer&apos;s starting rating, a
          multiple of 25 and at least 100. Current rating of{" "}
          <strong>{player.nickname}</strong>: {player.rating}.
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {[-100, -25].map((delta) => (
            <button
              key={delta}
              type="button"
              disabled={rating + delta < MIN_START_RATING || settingRating}
              onClick={() => setRating(rating + delta)}
              className="border-base-content/20 h-11 min-w-12 rounded-xl border px-2 text-sm font-medium disabled:opacity-30"
            >
              {delta}
            </button>
          ))}
          <span className="w-20 text-center text-3xl font-semibold tabular-nums">
            {rating}
          </span>
          {[25, 100].map((delta) => (
            <button
              key={delta}
              type="button"
              disabled={settingRating}
              onClick={() => setRating(rating + delta)}
              className="h-11 min-w-12 rounded-xl bg-[#712BB2] px-2 text-sm font-medium text-white disabled:opacity-30"
            >
              +{delta}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setRatingOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSetRating}
            disabled={settingRating || rating === player.rating}
          >
            {settingRating ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Save"
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}
