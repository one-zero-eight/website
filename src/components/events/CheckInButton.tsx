import { $workshops } from "@/api/workshops";
import { useToast } from "@/components/toast";
import {
  getInactiveStatusText,
  getSignedPeopleCount,
  isWorkshopActive,
} from "@/components/events/event-utils";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { SchemaWorkshop } from "@/api/workshops/types";

export interface CheckInButtonProps {
  event: SchemaWorkshop;
  className?: string | undefined | null;
}

export function CheckInButton({ event, className }: CheckInButtonProps) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");

  const checkedIn = !!myCheckins?.some((w) => w.id === event.id);
  const signedPeople = (event && getSignedPeopleCount(event)) || 0;

  const { mutate: checkIn, isPending: isCheckInPending } =
    $workshops.useMutation("post", "/workshops/{workshop_id}/checkin", {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions(
            "get",
            "/workshops/{workshop_id}/checkins",
            {
              params: { path: { workshop_id: event.id } },
            },
          ).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/users/my_checkins")
            .queryKey,
        });
      },
      onSuccess: () => {
        showSuccess(
          "Check-in Successful",
          "You have successfully checked-in for this event.",
        );
      },
      onError: () => {
        showError(
          "Check-in Failed",
          "Failed to check in. Please try again. Probably you have overlapping events",
        );
      },
    });

  const { mutate: checkOut, isPending: isCheckOutPending } =
    $workshops.useMutation("post", "/workshops/{workshop_id}/checkout", {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions(
            "get",
            "/workshops/{workshop_id}/checkins",
            {
              params: { path: { workshop_id: event.id } },
            },
          ).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/users/my_checkins")
            .queryKey,
        });
      },
      onSuccess: () => {
        showSuccess(
          "Check-out Successful",
          "You have successfully checked-out from this event.",
        );
      },
      onError: () => {
        showError("Check-out Failed", "Failed to check out. Please try again.");
      },
    });

  const handleCheckIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isCheckInPending) return;
    checkIn({
      params: { path: { workshop_id: event.id } },
    });
  };

  const handleCheckOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isCheckOutPending) return;
    checkOut({
      params: { path: { workshop_id: event.id } },
    });
  };

  if (!event) {
    return null;
  }

  if (!isWorkshopActive(event)) {
    return (
      <p className={clsx("btn btn-disabled", className)}>
        {getInactiveStatusText(event)}
      </p>
    );
  }

  if (checkedIn) {
    return (
      <button
        type="button"
        disabled={isCheckOutPending}
        onClick={handleCheckOut}
        className={clsx("btn dark:btn-soft btn-error", className)}
        title={"Check out"}
      >
        Check out
      </button>
    );
  }

  if (signedPeople >= (event.capacity || 0)) {
    return (
      <span className={clsx("btn btn-disabled", className)}>
        No empty places
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isCheckInPending}
      onClick={handleCheckIn}
      className={clsx("btn dark:btn-soft btn-success", className)}
      title={"Add to calendar"}
    >
      Add to calendar
    </button>
  );
}
