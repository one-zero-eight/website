import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
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
  formatApiErrorDescriptor,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast, type ToastText } from "@/components/toast";
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
  const { t } = useLingui();
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

  function handleError(error: unknown, action: ToastText) {
    if (isApiHttpError(error) && error.httpCode === 403) {
      showError(msg`Access denied`, action);
    } else {
      showError(msg`Error`, formatApiErrorDescriptor(error as never));
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
            msg`Status updated`,
            targetStatus === "advanced"
              ? msg`${player.nickname} is now Advanced`
              : msg`${player.nickname} is now Beginner`,
          );
          refresh();
          setConfirmOpen(false);
        },
        onError: (error) =>
          handleError(error, msg`Only administrators can change player status`),
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
          showSuccess(msg`Rating updated`, `${player.nickname}: ${rating}`);
          refresh();
          setRatingOpen(false);
        },
        onError: (error) =>
          handleError(error, msg`Only administrators can change player rating`),
      },
    );
  }

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={t`Actions for ${player.nickname}`}
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
                {targetStatus === "advanced" ? (
                  <Trans>Upgrade to Advanced</Trans>
                ) : (
                  <Trans>Downgrade to Beginner</Trans>
                )}
              </button>
            </li>
            <li>
              <button type="button" className="min-h-11" onClick={openRating}>
                <span className="icon-[mdi--star-cog-outline] text-primary" />
                <Trans>Set rating</Trans>
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
                  <Trans>Link to account</Trans>
                </button>
              </li>
            )}
          </ul>
        </FloatingPortal>
      )}

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t`Confirm status change`}
      >
        <p className="text-base-content/80">
          {targetStatus === "beginner" ? (
            <Trans>
              Are you sure you want to downgrade{" "}
              <strong>{player.nickname}</strong> to Beginner?
            </Trans>
          ) : (
            <Trans>
              Are you sure you want to upgrade{" "}
              <strong>{player.nickname}</strong> to Advanced?
            </Trans>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirmOpen(false)}
          >
            <Trans>Cancel</Trans>
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
              <Trans>Confirm</Trans>
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

      <Modal
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        title={t`Set rating`}
      >
        <form onSubmit={handleSetRating}>
          <p className="text-base-content/70 text-sm">
            <Trans>
              Current rating of <strong>{player.nickname}</strong>:{" "}
              {player.rating}. Enter any whole number from 0.
            </Trans>
          </p>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoFocus
            value={ratingInput}
            onChange={(e) => setRatingInput(e.target.value)}
            aria-label={t`New rating`}
            className="input input-bordered mt-3 h-14 w-full text-center text-3xl font-semibold tabular-nums"
          />
          {ratingInput.trim() !== "" && rating === null && (
            <p className="text-error mt-1 text-xs">
              <Trans>The rating must be a whole number from 0.</Trans>
            </p>
          )}
          {targetStatus === "advanced" &&
            rating !== null &&
            player.rating < ADVANCED_RATING &&
            rating >= ADVANCED_RATING && (
              <p className="text-base-content/60 mt-1 text-xs">
                <Trans>
                  {player.nickname} will become Advanced ({ADVANCED_RATING}+).
                </Trans>
              </p>
            )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRatingOpen(false)}
            >
              <Trans>Cancel</Trans>
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
                <Trans>Save</Trans>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
