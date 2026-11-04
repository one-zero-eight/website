import { $boardGames } from "@/api/board-games";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import {
  boardGamesModalClassName,
  InformationField,
  getReservationStatusLabel,
  ReservationStatusBadge,
  telegramHandle,
} from "@/components/board-games/shared.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

const reservationStatuses = [
  ReservationStatus.reserved,
  ReservationStatus.taken,
  ReservationStatus.returned,
];

export function ReservationDetailsModal({
  reservation,
  gameTitle,
  onOpenChange,
}: {
  reservation: SchemaReservation;
  gameTitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(reservation.status);
  const [isBorrowerModalOpen, setIsBorrowerModalOpen] = useState(false);
  const telegram = telegramHandle(reservation.tg_alias);

  function invalidateAdminQueries() {
    queryClient.invalidateQueries({
      queryKey: $boardGames.queryOptions("get", "/admin/reservations").queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $boardGames.queryOptions("get", "/admin/board-games").queryKey,
    });
  }

  const statusMutation = $boardGames.useMutation(
    "patch",
    "/admin/reservations/{id}",
    {
      onSuccess: () => {
        invalidateAdminQueries();
        showSuccess(
          msg`Reservation updated`,
          msg`The new status has been saved.`,
        );
        setIsBorrowerModalOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        showError(
          msg`Could not update reservation`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );
  const deleteMutation = $boardGames.useMutation(
    "delete",
    "/admin/reservations/{id}",
    {
      onSuccess: () => {
        invalidateAdminQueries();
        showSuccess(
          msg`Reservation deleted`,
          msg`The reservation was removed.`,
        );
        onOpenChange(false);
      },
      onError: (error) => {
        showError(
          msg`Could not delete reservation`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );
  const isMutationPending =
    statusMutation.isPending || deleteMutation.isPending;

  function updateStatus(borrowerName: string | null) {
    if (!reservation.id) return;
    statusMutation.mutate({
      params: { path: { id: reservation.id } },
      body: { status: selectedStatus, borrower_name: borrowerName },
    });
  }

  function handleUpdateStatus() {
    if (selectedStatus === reservation.status) return;
    if (
      selectedStatus === ReservationStatus.taken &&
      reservation.status !== ReservationStatus.taken
    ) {
      setIsBorrowerModalOpen(true);
      return;
    }
    updateStatus(reservation.borrower_name);
  }

  async function handleDelete() {
    const confirmed = await showConfirm({
      title: msg`Delete reservation`,
      message: gameTitle
        ? msg`Delete the reservation for ${gameTitle}? This action cannot be undone.`
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
        containerClassName={boardGamesModalClassName}
        closeOnOutsidePress={!isMutationPending}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 @sm/modal:grid-cols-2">
          {gameTitle && (
            <InformationField label={t`Game`} className="@sm/modal:col-span-2">
              {gameTitle}
            </InformationField>
          )}
          <InformationField label={t`User email`}>
            {reservation.user_email}
          </InformationField>
          <InformationField label={t`Status`}>
            <ReservationStatusBadge status={reservation.status} />
          </InformationField>
          <InformationField label={t`Telegram alias`}>
            {telegram ? (
              <a
                href={`https://t.me/${telegram}`}
                className="link link-hover"
                target="_blank"
                rel="noreferrer"
              >
                @{telegram}
              </a>
            ) : (
              t`Not provided`
            )}
          </InformationField>
          <InformationField label={t`Return date`}>
            {reservation.return_date || t`Not provided`}
          </InformationField>
          <InformationField
            label={t`When available`}
            className="@sm/modal:col-span-2"
          >
            {reservation.when_available || t`Not provided`}
          </InformationField>
          <InformationField
            label={t`Comments`}
            className="@sm/modal:col-span-2"
          >
            {reservation.comments || t`Not provided`}
          </InformationField>
          <InformationField label={t`Borrower name`}>
            {reservation.borrower_name || t`Not provided`}
          </InformationField>
          <InformationField label={t`Created at`}>
            {new Date(reservation.created_at).toLocaleString(i18n.locale)}
          </InformationField>
        </div>

        <div className="border-base-300 mt-2 flex flex-col gap-3 border-t pt-4">
          <label className="fieldset">
            <span className="fieldset-legend">
              <Trans>Update status</Trans>
            </span>
            <select
              className="select w-full"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as ReservationStatus)
              }
              disabled={isMutationPending}
            >
              {reservationStatuses.map((status) => (
                <option key={status} value={status}>
                  {i18n._(getReservationStatusLabel(status))}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="btn btn-error btn-outline"
              onClick={() => void handleDelete()}
              disabled={isMutationPending}
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
              onClick={handleUpdateStatus}
              disabled={
                isMutationPending || selectedStatus === reservation.status
              }
            >
              {statusMutation.isPending && (
                <span className="loading loading-spinner loading-sm" />
              )}
              <Trans>Update status</Trans>
            </button>
          </div>
        </div>
      </Modal>

      {isBorrowerModalOpen && (
        <BorrowerNameModal
          onOpenChange={setIsBorrowerModalOpen}
          onSubmit={updateStatus}
          isPending={statusMutation.isPending}
        />
      )}
    </>
  );
}

export function BorrowerNameModal({
  onOpenChange,
  onSubmit,
  isPending,
  confirmLabel,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: (borrowerName: string) => void;
  isPending: boolean;
  confirmLabel?: string;
}) {
  const { t } = useLingui();
  const [borrowerName, setBorrowerName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!borrowerName.trim()) return;
    onSubmit(borrowerName.trim());
  }

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={t`Confirm borrower`}
      containerClassName={boardGamesModalClassName}
      closeOnOutsidePress={!isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="fieldset">
          <span className="fieldset-legend">
            <Trans>Borrower name</Trans>
          </span>
          <input
            type="text"
            className="input w-full"
            value={borrowerName}
            onChange={(event) => setBorrowerName(event.target.value)}
            placeholder={t`Full name`}
            disabled={isPending}
            autoFocus
            required
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !borrowerName.trim()}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {confirmLabel ?? t`Update status`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
