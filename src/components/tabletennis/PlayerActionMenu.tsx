import { useState } from "react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { MergeGuestModal } from "./MergeGuestModal";
import { useTabletennisRefresh } from "./useTabletennisRefresh";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

/** a beginner reaching this rating becomes advanced automatically (backend) */
const ADVANCED_RATING = 350;

/** a whole number from 0, or null */
function parseRating(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function PlayerActionMenu({
  player,
}: {
  player: SchemaPlayer & { is_active: boolean };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const refresh = useTabletennisRefresh();
  const { showSuccess, showError } = useToast();

  // the menu is rendered in a portal, so it floats over the page instead of
  // stretching the scrollable table it is opened from
  const { refs, floatingStyles, context } = useFloating({
    placement: "bottom-end",
    open: menuOpen,
    onOpenChange: setMenuOpen,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: "menu" }),
  ]);

  const { mutate, isPending } = $tabletennis.useMutation("post", "/set-status");
  const { mutate: setRatingMutate, isPending: settingRating } =
    $tabletennis.useMutation("post", "/set-rating");

  function handleError(error: unknown, action: string) {
    if (isApiHttpError(error) && error.httpCode === 403) {
      showError("Access denied", `Only administrators can ${action}`);
    } else {
      showError("Error", formatApiErrorMessage(error as never));
    }
  }

  // advanced can be downgraded back, everyone else can be upgraded
  const targetStatus: "advanced" | "beginner" =
    player.status.toLowerCase() === "advanced" ? "beginner" : "advanced";

  const rating = parseRating(ratingInput);

  function openFromMenu(open: (value: boolean) => void) {
    setMenuOpen(false);
    open(true);
  }

  function handleConfirm() {
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
          refresh();
          setConfirmOpen(false);
        },
        onError: (error) => handleError(error, "change player status"),
      },
    );
  }

  function openRating() {
    setRatingInput(String(player.rating));
    openFromMenu(setRatingOpen);
  }

  function handleSetRating(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null || rating === player.rating) return;
    setRatingMutate(
      {
        params: { query: { innohassle_id: player.innohassle_id, rating } },
      },
      {
        onSuccess: () => {
          showSuccess("Rating updated", `${player.nickname}: ${rating}`);
          refresh();
          setRatingOpen(false);
        },
        onError: (error) => handleError(error, "change player rating"),
      },
    );
  }

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={`Actions for ${player.nickname}`}
        className="btn btn-ghost btn-sm btn-square"
        {...getReferenceProps()}
      >
        <span className="icon-[material-symbols--more-vert] text-lg" />
      </button>

      {menuOpen && (
        <FloatingPortal>
          <ul
            ref={refs.setFloating}
            style={floatingStyles}
            className="menu bg-base-200 rounded-box z-50 w-56 p-2 shadow-lg"
            {...getFloatingProps()}
          >
            <li>
              <button
                type="button"
                className="min-h-11"
                onClick={() => openFromMenu(setConfirmOpen)}
              >
                <span
                  className={
                    targetStatus === "advanced"
                      ? "icon-[material-symbols--upgrade] text-primary"
                      : "icon-[material-symbols--upgrade] text-primary rotate-180"
                  }
                />
                {targetStatus === "advanced"
                  ? "Upgrade to Advanced"
                  : "Downgrade to Beginner"}
              </button>
            </li>
            <li>
              <button type="button" className="min-h-11" onClick={openRating}>
                <span className="icon-[mdi--star-cog-outline] text-primary" />
                Set rating
              </button>
            </li>
            {player.placeholder && (
              <li>
                <button
                  type="button"
                  className="min-h-11"
                  onClick={() => openFromMenu(setMergeOpen)}
                >
                  <span className="icon-[mdi--account-arrow-right-outline] text-primary" />
                  Link to account
                </button>
              </li>
            )}
          </ul>
        </FloatingPortal>
      )}

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

      {player.placeholder && (
        <MergeGuestModal
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          guest={player}
        />
      )}

      <Modal open={ratingOpen} onOpenChange={setRatingOpen} title="Set rating">
        <form onSubmit={handleSetRating}>
          <p className="text-base-content/70 text-sm">
            Current rating of <strong>{player.nickname}</strong>:{" "}
            {player.rating}. Enter any whole number from 0.
          </p>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoFocus
            value={ratingInput}
            onChange={(e) => setRatingInput(e.target.value)}
            aria-label="New rating"
            className="input input-bordered mt-3 h-14 w-full text-center text-3xl font-semibold tabular-nums"
          />
          {ratingInput.trim() !== "" && rating === null && (
            <p className="text-error mt-1 text-xs">
              The rating must be a whole number from 0.
            </p>
          )}
          {targetStatus === "advanced" &&
            rating !== null &&
            player.rating < ADVANCED_RATING &&
            rating >= ADVANCED_RATING && (
              <p className="text-base-content/60 mt-1 text-xs">
                {player.nickname} will become Advanced ({ADVANCED_RATING}+).
              </p>
            )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRatingOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                settingRating || rating === null || rating === player.rating
              }
            >
              {settingRating ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
