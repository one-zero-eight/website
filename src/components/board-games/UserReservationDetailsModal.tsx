import { ReservationOverdueTag } from "./ReservationOverdueTag";
import { $boardGames } from "@/api/board-games";
import { $accounts } from "@/api/accounts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaReservationOut,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { getReservationStatusLabel } from "./reservation-presentation";

export function UserReservationDetailsModal({
  reservation,
  gameTitle,
  onOpenChange,
}: {
  reservation: SchemaReservationOut;
  gameTitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isReserved = reservation.status === ReservationStatus.reserved;

  function invalidateUserBoardGameQueries() {
    queryClient.invalidateQueries({
      queryKey: $boardGames.queryOptions("get", "/users/me/reservations")
        .queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $boardGames.queryOptions("get", "/board-games").queryKey,
    });
  }

  const deleteMutation = $boardGames.useMutation(
    "delete",
    "/users/me/reservations/{id}",
    {
      onSuccess: () => {
        invalidateUserBoardGameQueries();
        showSuccess(
          msg`Reservation deleted`,
          msg`Your reservation was removed.`,
        );
        onOpenChange(false);
      },
      onError: (error) => {
        showError(
          msg`Could not delete reservation`,
          formatApiErrorMessage(error),
        );
      },
    },
  );

  async function handleDelete() {
    const confirmed = await showConfirm({
      title: msg`Delete reservation`,
      message: gameTitle
        ? msg`Delete your reservation for ${gameTitle}? This action cannot be undone.`
        : msg`Delete this reservation? This action cannot be undone.`,
      confirmText: msg`Delete reservation`,
      type: "error",
    });
    if (!confirmed) return;
    if (!reservation.id) return;
    deleteMutation.mutate({ params: { path: { id: reservation.id } } });
  }

  return (
    <>
      <Modal
        open
        onOpenChange={onOpenChange}
        title={t`Reservation information`}
        closeOnOutsidePress={!deleteMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
          {gameTitle && (
            <InformationField label={t`Game`} className="@sm/modal:col-span-2">
              {gameTitle}
            </InformationField>
          )}
          <InformationField label={t`Status`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <ReservationStatusBadge status={reservation.status} />
              <ReservationOverdueTag reservation={reservation} />
            </div>
          </InformationField>
          <InformationField label={t`Telegram alias`}>
            {reservation.tg_alias
              ? `@${reservation.tg_alias.replace(/^@/, "")}`
              : t`Not provided`}
          </InformationField>
          <InformationField label={t`Return date`}>
            {reservation.return_date || t`Not provided`}
          </InformationField>
          <InformationField label={t`Created at`}>
            {new Date(reservation.created_at).toLocaleString(i18n.locale)}
          </InformationField>
          {reservation.when_available?.trim() && (
            <InformationField
              label={t`When available`}
              className="@sm/modal:col-span-2"
            >
              {reservation.when_available}
            </InformationField>
          )}
          {reservation.comments?.trim() && (
            <InformationField
              label={t`Comments`}
              className="@sm/modal:col-span-2"
            >
              {reservation.comments}
            </InformationField>
          )}
          {reservation.borrower_name && (
            <InformationField
              label={t`Borrower name`}
              className="@sm/modal:col-span-2"
            >
              {reservation.borrower_name}
            </InformationField>
          )}
        </div>

        {isReserved && (
          <div className="border-base-300 mt-2 flex justify-between gap-2 border-t pt-4">
            <button
              type="button"
              className="btn btn-error btn-outline"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <span className="icon-[material-symbols--delete-outline] text-xl" />
              )}
              <Trans>Delete</Trans>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsEditModalOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <span className="icon-[material-symbols--edit-outline] text-xl" />
              <Trans>Edit</Trans>
            </button>
          </div>
        )}
      </Modal>

      <EditReservationModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        reservation={reservation}
        onSuccess={() => {
          invalidateUserBoardGameQueries();
          onOpenChange(false);
        }}
      />
    </>
  );
}

function EditReservationModal({
  open,
  onOpenChange,
  reservation,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: SchemaReservationOut;
  onSuccess: () => void;
}) {
  const { t } = useLingui();
  const { showError, showSuccess } = useToast();
  const accountQuery = $accounts.useQuery("get", "/users/me", undefined, {
    enabled: open,
  });
  const telegramAlias =
    accountQuery.data?.telegram_info?.username?.trim() ?? "";
  const accountErrorMessage = formatApiErrorMessage(accountQuery.error);
  const [returnDate, setReturnDate] = useState(reservation.return_date ?? "");
  const [whenAvailable, setWhenAvailable] = useState(
    reservation.when_available ?? "",
  );
  const [comments, setComments] = useState(reservation.comments ?? "");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const validationError =
    hasAttemptedSubmit && !returnDate ? t`Return date is required.` : null;
  const mutation = $boardGames.useMutation(
    "patch",
    "/users/me/reservations/{id}",
    {
      onSuccess: () => {
        showSuccess(
          msg`Reservation updated`,
          msg`Your changes have been saved.`,
        );
        onSuccess();
      },
      onError: (error) => {
        showError(
          msg`Could not update reservation`,
          formatApiErrorMessage(error),
        );
      },
    },
  );

  function resetForm() {
    setReturnDate(reservation.return_date ?? "");
    setWhenAvailable(reservation.when_available ?? "");
    setComments(reservation.comments ?? "");
    setHasAttemptedSubmit(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      mutation.isPending ||
      accountQuery.isPending ||
      accountQuery.isError ||
      !telegramAlias
    )
      return;
    setHasAttemptedSubmit(true);
    if (!returnDate) return;
    if (!reservation.id) return;
    mutation.mutate({
      params: { path: { id: reservation.id } },
      body: {
        tg_alias: telegramAlias,
        return_date: returnDate || null,
        when_available: whenAvailable.trim() || null,
        comments: comments.trim() || null,
      },
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t`Edit reservation`}
      closeOnOutsidePress={!mutation.isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {accountQuery.isPending && <div className="skeleton h-10 w-full" />}
        {accountQuery.isError && (
          <div className="alert alert-error text-sm">
            <span>
              <Trans>
                Could not load your Telegram account: {accountErrorMessage}
              </Trans>
            </span>
          </div>
        )}
        {!accountQuery.isPending && !accountQuery.isError && !telegramAlias && (
          <div className="alert alert-warning text-sm">
            <span>
              <Trans>
                Connect Telegram in your account settings and make sure it has a
                username before saving your reservation.
              </Trans>
            </span>
            <Link to="/account" className="link">
              <Trans>Account settings</Trans>
            </Link>
          </div>
        )}
        <ReservationFormFields
          returnDate={returnDate}
          onReturnDateChange={setReturnDate}
          whenAvailable={whenAvailable}
          onWhenAvailableChange={setWhenAvailable}
          comments={comments}
          onCommentsChange={setComments}
          disabled={mutation.isPending}
          validationError={validationError}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              mutation.isPending ||
              accountQuery.isPending ||
              accountQuery.isError ||
              !telegramAlias
            }
          >
            {mutation.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            <Trans>Save changes</Trans>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReservationFormFields({
  returnDate,
  onReturnDateChange,
  whenAvailable,
  onWhenAvailableChange,
  comments,
  onCommentsChange,
  disabled,
  validationError,
}: {
  returnDate: string;
  onReturnDateChange: (value: string) => void;
  whenAvailable: string;
  onWhenAvailableChange: (value: string) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
  disabled: boolean;
  validationError?: string | null;
}) {
  const { t } = useLingui();
  return (
    <>
      {validationError && (
        <div className="alert alert-error py-2 text-sm">
          <span className="icon-[material-symbols--error-outline] shrink-0 text-xl" />
          <span>{validationError}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
        <label className="fieldset">
          <span className="fieldset-legend">
            <Trans>Return date *</Trans>
          </span>
          <input
            type="date"
            className="input w-full"
            value={returnDate}
            onChange={(event) => onReturnDateChange(event.target.value)}
            disabled={disabled}
            required
          />
        </label>
      </div>
      <label className="fieldset">
        <span className="fieldset-legend">
          <Trans>When available</Trans>
        </span>
        <input
          type="text"
          className="input w-full"
          value={whenAvailable}
          onChange={(event) => onWhenAvailableChange(event.target.value)}
          placeholder={t`Preferred pickup time`}
          disabled={disabled}
        />
      </label>
      <label className="fieldset">
        <span className="fieldset-legend">
          <Trans>Comments</Trans>
        </span>
        <textarea
          className="textarea min-h-24 w-full resize-y"
          value={comments}
          onChange={(event) => onCommentsChange(event.target.value)}
          placeholder={t`Additional information`}
          disabled={disabled}
        />
      </label>
    </>
  );
}

function InformationField({
  label,
  className,
  children,
}: React.PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-base-content/60 text-xs font-semibold uppercase">
        {label}
      </p>
      <div className="wrap-break-word">{children}</div>
    </div>
  );
}

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { i18n } = useLingui();
  return (
    <span
      className={cn(
        "badge capitalize",
        status === ReservationStatus.reserved && "badge-warning",
        status === ReservationStatus.taken && "badge-info",
        status === ReservationStatus.returned && "badge-success",
      )}
    >
      {i18n._(getReservationStatusLabel(status))}
    </span>
  );
}
