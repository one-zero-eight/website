import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

export function UserReservationDetailsModal({
  reservation,
  gameTitle,
  onOpenChange,
}: {
  reservation: SchemaReservation;
  gameTitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
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
        showSuccess("Reservation deleted", "Your reservation was removed.");
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Could not delete reservation", formatApiErrorMessage(error));
      },
    },
  );

  async function handleDelete() {
    const confirmed = await showConfirm({
      title: "Delete reservation",
      message: `Delete your reservation for ${gameTitle ?? "this game"}? This action cannot be undone.`,
      confirmText: "Delete reservation",
      type: "error",
    });
    if (!confirmed) return;
    deleteMutation.mutate({ params: { path: { id: reservation.id } } });
  }

  return (
    <>
      <Modal
        open
        onOpenChange={onOpenChange}
        title="Reservation information"
        closeOnOutsidePress={!deleteMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
          {gameTitle && (
            <InformationField label="Game" className="@sm/modal:col-span-2">
              {gameTitle}
            </InformationField>
          )}
          <InformationField label="Status">
            <ReservationStatusBadge status={reservation.status} />
          </InformationField>
          <InformationField label="Telegram alias">
            {reservation.tg_alias
              ? `@${reservation.tg_alias.replace(/^@/, "")}`
              : "Not provided"}
          </InformationField>
          <InformationField label="Return date">
            {reservation.return_date || "Not provided"}
          </InformationField>
          <InformationField label="Created at">
            {new Date(reservation.created_at).toLocaleString()}
          </InformationField>
          <InformationField
            label="When available"
            className="@sm/modal:col-span-2"
          >
            {reservation.when_available || "Not provided"}
          </InformationField>
          <InformationField label="Comments" className="@sm/modal:col-span-2">
            {reservation.comments || "Not provided"}
          </InformationField>
          {reservation.borrower_name && (
            <InformationField
              label="Borrower name"
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
              Delete
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsEditModalOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <span className="icon-[material-symbols--edit-outline] text-xl" />
              Edit
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
  reservation: SchemaReservation;
  onSuccess: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [telegramAlias, setTelegramAlias] = useState(
    reservation.tg_alias ?? "",
  );
  const [returnDate, setReturnDate] = useState(reservation.return_date ?? "");
  const [whenAvailable, setWhenAvailable] = useState(
    reservation.when_available ?? "",
  );
  const [comments, setComments] = useState(reservation.comments ?? "");
  const mutation = $boardGames.useMutation(
    "patch",
    "/users/me/reservations/{id}",
    {
      onSuccess: () => {
        showSuccess("Reservation updated", "Your changes have been saved.");
        onSuccess();
      },
      onError: (error) => {
        showError("Could not update reservation", formatApiErrorMessage(error));
      },
    },
  );

  function resetForm() {
    setTelegramAlias(reservation.tg_alias ?? "");
    setReturnDate(reservation.return_date ?? "");
    setWhenAvailable(reservation.when_available ?? "");
    setComments(reservation.comments ?? "");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      params: { path: { id: reservation.id } },
      body: {
        tg_alias: telegramAlias.trim() || null,
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
      title="Edit reservation"
      closeOnOutsidePress={!mutation.isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <ReservationFormFields
          telegramAlias={telegramAlias}
          onTelegramAliasChange={setTelegramAlias}
          returnDate={returnDate}
          onReturnDateChange={setReturnDate}
          whenAvailable={whenAvailable}
          onWhenAvailableChange={setWhenAvailable}
          comments={comments}
          onCommentsChange={setComments}
          disabled={mutation.isPending}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReservationFormFields({
  telegramAlias,
  onTelegramAliasChange,
  returnDate,
  onReturnDateChange,
  whenAvailable,
  onWhenAvailableChange,
  comments,
  onCommentsChange,
  disabled,
}: {
  telegramAlias: string;
  onTelegramAliasChange: (value: string) => void;
  returnDate: string;
  onReturnDateChange: (value: string) => void;
  whenAvailable: string;
  onWhenAvailableChange: (value: string) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
        <label className="fieldset">
          <span className="fieldset-legend">Telegram alias</span>
          <input
            type="text"
            className="input w-full"
            value={telegramAlias}
            onChange={(event) => onTelegramAliasChange(event.target.value)}
            placeholder="@username"
            disabled={disabled}
          />
        </label>
        <label className="fieldset">
          <span className="fieldset-legend">Return date</span>
          <input
            type="date"
            className="input w-full"
            value={returnDate}
            onChange={(event) => onReturnDateChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
      <label className="fieldset">
        <span className="fieldset-legend">When available</span>
        <input
          type="text"
          className="input w-full"
          value={whenAvailable}
          onChange={(event) => onWhenAvailableChange(event.target.value)}
          placeholder="Preferred pickup time"
          disabled={disabled}
        />
      </label>
      <label className="fieldset">
        <span className="fieldset-legend">Comments</span>
        <textarea
          className="textarea min-h-24 w-full resize-y"
          value={comments}
          onChange={(event) => onCommentsChange(event.target.value)}
          placeholder="Additional information"
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
  return (
    <span
      className={cn(
        "badge capitalize",
        status === ReservationStatus.reserved && "badge-warning",
        status === ReservationStatus.taken && "badge-info",
        status === ReservationStatus.returned && "badge-success",
      )}
    >
      {status}
    </span>
  );
}
