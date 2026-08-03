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
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(reservation.status);
  const [isBorrowerModalOpen, setIsBorrowerModalOpen] = useState(false);

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
    "/admin/reservations/{id}/status",
    {
      onSuccess: () => {
        invalidateAdminQueries();
        showSuccess("Reservation updated", "The new status has been saved.");
        setIsBorrowerModalOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Could not update reservation", formatApiErrorMessage(error));
      },
    },
  );
  const deleteMutation = $boardGames.useMutation(
    "delete",
    "/admin/reservations/{id}",
    {
      onSuccess: () => {
        invalidateAdminQueries();
        showSuccess("Reservation deleted", "The reservation was removed.");
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Could not delete reservation", formatApiErrorMessage(error));
      },
    },
  );
  const isMutationPending =
    statusMutation.isPending || deleteMutation.isPending;

  function updateStatus(borrowerName: string | null) {
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
      title: "Delete reservation",
      message: `Delete the reservation for ${gameTitle ?? "this game"}? This action cannot be undone.`,
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
        closeOnOutsidePress={!isMutationPending}
      >
        <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
          {gameTitle && (
            <InformationField label="Game" className="@sm/modal:col-span-2">
              {gameTitle}
            </InformationField>
          )}
          <InformationField label="User email">
            {reservation.user_email}
          </InformationField>
          <InformationField label="Status">
            <ReservationStatusBadge status={reservation.status} />
          </InformationField>
          <InformationField label="Telegram alias">
            {reservation.tg_alias ? (
              <a
                href={`https://t.me/${reservation.tg_alias.replace(/^@/, "")}`}
                className="link link-hover"
                target="_blank"
                rel="noreferrer"
              >
                @{reservation.tg_alias.replace(/^@/, "")}
              </a>
            ) : (
              "Not provided"
            )}
          </InformationField>
          <InformationField label="Return date">
            {reservation.return_date || "Not provided"}
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
          <InformationField label="Borrower name">
            {reservation.borrower_name || "Not provided"}
          </InformationField>
          <InformationField label="Created at">
            {new Date(reservation.created_at).toLocaleString()}
          </InformationField>
        </div>

        <div className="border-base-300 mt-2 flex flex-col gap-3 border-t pt-4">
          <label className="fieldset">
            <span className="fieldset-legend">Update status</span>
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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
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
              Delete
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
              Update status
            </button>
          </div>
        </div>
      </Modal>

      <BorrowerNameModal
        open={isBorrowerModalOpen}
        onOpenChange={setIsBorrowerModalOpen}
        onSubmit={updateStatus}
        isPending={statusMutation.isPending}
      />
    </>
  );
}

function BorrowerNameModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (borrowerName: string) => void;
  isPending: boolean;
}) {
  const [borrowerName, setBorrowerName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!borrowerName.trim()) return;
    onSubmit(borrowerName.trim());
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm borrower"
      closeOnOutsidePress={!isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="fieldset">
          <span className="fieldset-legend">Borrower name</span>
          <input
            type="text"
            className="input w-full"
            value={borrowerName}
            onChange={(event) => setBorrowerName(event.target.value)}
            placeholder="Full name"
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
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !borrowerName.trim()}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Update status
          </button>
        </div>
      </form>
    </Modal>
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
