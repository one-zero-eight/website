import { ReservationOverdueTag } from "./ReservationOverdueTag.tsx";
import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaReservationOut,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { reservationStatusOptions } from "./reservation-presentation";

export function ReservationDetailsModal({
  reservation,
  gameTitle,
  onOpenChange,
}: {
  reservation: SchemaReservationOut;
  gameTitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(reservation.status);
  const [returnDate, setReturnDate] = useState(reservation.return_date ?? "");
  const [borrowerName, setBorrowerName] = useState(
    reservation.borrower_name ?? "",
  );
  const isStatusChanged = selectedStatus !== reservation.status;
  const isReturnDateChanged = returnDate !== (reservation.return_date ?? "");
  const needsBorrowerName = selectedStatus === ReservationStatus.taken;
  const isBorrowerNameChanged =
    needsBorrowerName &&
    borrowerName.trim() !== (reservation.borrower_name ?? "");
  const hasChanges =
    isStatusChanged || isReturnDateChanged || isBorrowerNameChanged;
  const isBorrowerNameRequired =
    needsBorrowerName && (isStatusChanged || isBorrowerNameChanged);
  const isValid =
    (!isReturnDateChanged || Boolean(returnDate)) &&
    (!isBorrowerNameRequired || Boolean(borrowerName.trim()));

  function invalidateReservationQueries() {
    for (const path of [
      "/admin/reservations",
      "/admin/board-games",
      "/users/me/reservations",
      "/board-games",
    ] as const) {
      void queryClient.invalidateQueries({
        queryKey: $boardGames.queryOptions("get", path).queryKey,
      });
    }
  }

  const updateMutation = $boardGames.useMutation(
    "patch",
    "/admin/reservations/{id}",
    {
      onSuccess: () => {
        invalidateReservationQueries();
        showSuccess("Reservation updated", "Your changes have been saved.");
        onOpenChange(false);
      },
    },
  );
  const deleteMutation = $boardGames.useMutation(
    "delete",
    "/admin/reservations/{id}",
    {
      onSuccess: () => {
        invalidateReservationQueries();
        showSuccess("Reservation deleted", "The reservation was removed.");
        onOpenChange(false);
      },
      onError: (error) =>
        showError("Could not delete reservation", formatApiErrorMessage(error)),
    },
  );
  const isPending = updateMutation.isPending || deleteMutation.isPending;

  function handleSave() {
    if (isPending || !reservation.id || !hasChanges || !isValid) return;
    updateMutation.mutate({
      params: { path: { id: reservation.id } },
      body: {
        ...(isStatusChanged && { status: selectedStatus }),
        ...(isReturnDateChanged && { return_date: returnDate }),
        ...(needsBorrowerName &&
          (isStatusChanged || isBorrowerNameChanged) && {
            status: selectedStatus,
            borrower_name: borrowerName.trim(),
          }),
      },
    });
  }

  async function handleDelete() {
    if (isPending || !reservation.id) return;
    const confirmed = await showConfirm({
      title: "Delete reservation",
      message: `Delete the reservation for ${gameTitle ?? "this game"}? This action cannot be undone.`,
      confirmText: "Delete reservation",
      type: "error",
    });
    if (!confirmed) return;
    deleteMutation.mutate({ params: { path: { id: reservation.id } } });
  }

  return (
    <Modal
      open
      title="Manage reservation"
      closeOnOutsidePress={!isPending}
      onOpenChange={(open) => {
        if (!isPending) onOpenChange(open);
      }}
      containerClassName="bg-base-100 max-h-[calc(100dvh-2rem)] max-w-xl gap-5 overflow-y-auto p-5"
    >
      <div className="border-base-300 bg-base-200/40 rounded-box flex flex-col gap-4 border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-base-content/50 mb-1 text-xs font-medium">
              BOARD GAME
            </p>
            <h2 className="text-lg font-semibold wrap-break-word">
              {gameTitle ?? "Unknown game"}
            </h2>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
            <ReservationStatusBadge status={reservation.status} />
            <ReservationOverdueTag reservation={reservation} />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium wrap-break-word">
            {reservation.borrower_name || reservation.user_email}
          </p>
          {reservation.borrower_name && (
            <p className="text-base-content/60 wrap-break-word">
              {reservation.user_email}
            </p>
          )}
          {reservation.tg_alias && (
            <a
              className="link link-hover text-primary w-fit"
              href={`https://t.me/${reservation.tg_alias.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              @{reservation.tg_alias.replace(/^@/, "")}
            </a>
          )}
        </div>
        <p className="text-base-content/50 text-xs">
          Created {new Date(reservation.created_at).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <fieldset disabled={isPending} className="min-w-0">
          <legend className="mb-2 text-sm font-semibold">
            Reservation status
          </legend>
          <div className="grid grid-cols-1 gap-2 @sm/modal:grid-cols-3">
            {reservationStatusOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "rounded-box flex cursor-pointer items-center gap-3 border p-3 transition-colors @sm/modal:flex-col @sm/modal:items-start @sm/modal:gap-2",
                  selectedStatus === option.value
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:bg-base-200/50",
                  isPending && "cursor-default opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="reservation-status"
                  value={option.value}
                  checked={selectedStatus === option.value}
                  onChange={() => setSelectedStatus(option.value)}
                  className="radio radio-primary radio-sm @sm/modal:order-last"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className={cn("text-lg", option.icon)} />
                    {option.label}
                  </span>
                  <span className="text-base-content/60 text-xs">
                    {option.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-semibold">Return date</span>
            <input
              type="date"
              className="input w-full"
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              disabled={isPending}
            />
            <span className="text-base-content/50 text-xs">
              When the game should be back.
            </span>
            {isReturnDateChanged && !returnDate && (
              <span className="text-error text-xs">Choose a return date.</span>
            )}
          </label>
          {needsBorrowerName && (
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-semibold">
                Borrower name <span className="text-error">*</span>
              </span>
              <input
                type="text"
                className="input w-full"
                value={borrowerName}
                onChange={(event) => setBorrowerName(event.target.value)}
                placeholder="Full name"
                disabled={isPending}
              />
              <span className="text-base-content/50 text-xs">
                Who picked up the game.
              </span>
            </label>
          )}
        </div>
      </div>

      {(reservation.when_available?.trim() || reservation.comments?.trim()) && (
        <div className="border-base-300 flex flex-col gap-3 border-t pt-4 text-sm">
          {reservation.when_available?.trim() && (
            <div>
              <p className="text-base-content/50 mb-1 text-xs font-medium">
                Pickup availability
              </p>
              <p className="wrap-break-word whitespace-pre-wrap">
                {reservation.when_available}
              </p>
            </div>
          )}
          {reservation.comments?.trim() && (
            <div>
              <p className="text-base-content/50 mb-1 text-xs font-medium">
                Comments
              </p>
              <p className="wrap-break-word whitespace-pre-wrap">
                {reservation.comments}
              </p>
            </div>
          )}
        </div>
      )}

      {updateMutation.isError && (
        <div className="alert alert-error text-sm">
          <span className="icon-[material-symbols--error-outline] shrink-0 text-xl" />
          <span>{formatApiErrorMessage(updateMutation.error)}</span>
        </div>
      )}
      <div className="border-base-300 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <button
          type="button"
          className="btn btn-ghost text-error btn-sm"
          onClick={() => void handleDelete()}
          disabled={isPending}
        >
          {deleteMutation.isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--delete-outline] text-lg" />
          )}
          Delete
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isPending || !hasChanges || !isValid}
          >
            {updateMutation.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
