import { $workshops } from "@/api/workshops";
import { CheckInType } from "@/api/workshops/types";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/ui/cn";
import { CheckInButtonProps } from "./types";
import {
  getInactiveStatusText,
  getSignedPeopleCount,
  isEventCurrentlyGoing,
  isWorkshopActive,
} from "./utils";

export function CheckInButton({
  event,
  myCheckins: myCheckinsProp,
  className,
}: CheckInButtonProps) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const { data: myCheckinsData } = $workshops.useQuery(
    "get",
    "/users/my_checkins",
    {
      enabled: !myCheckinsProp,
    },
  );
  const myCheckins = myCheckinsProp ?? myCheckinsData;

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

  if (isEventCurrentlyGoing(event)) {
    return (
      <span
        className={cn(
          "btn btn-soft btn-warning pointer-events-none",
          className,
        )}
      >
        Currently going
      </span>
    );
  }

  if (!isWorkshopActive(event)) {
    return (
      <p className={cn("btn btn-disabled", className)}>
        {getInactiveStatusText(event)}
      </p>
    );
  }

  if (event.check_in_type === CheckInType.by_link) {
    if (!event.check_in_link) {
      return (
        <span className={cn("btn btn-disabled", className)}>
          Check-in link not available
        </span>
      );
    }
    return (
      <div
        className={cn("grid w-full grid-cols-2 gap-2 text-nowrap", className)}
      >
        <Link
          to={event.check_in_link!}
          target="_blank"
          className={cn("btn btn-soft btn-success w-full px-8")}
          title={"Check in"}
        >
          Check in
          <span className="icon-[material-symbols--open-in-new-rounded] min-h-[14px] min-w-[14px]" />
        </Link>
        {checkedIn ? (
          <button
            type="button"
            disabled={isCheckOutPending}
            onClick={handleCheckOut}
            className={cn("btn btn-soft btn-error w-full px-4")}
            title={"Remove from calendar"}
          >
            Remove from calendar
          </button>
        ) : (
          <button
            type="button"
            disabled={isCheckInPending}
            onClick={handleCheckIn}
            className={cn("btn btn-soft btn-success w-full px-4")}
            title={"Add to calendar"}
          >
            Add to calendar
          </button>
        )}
      </div>
    );
  }

  if (event.check_in_type === CheckInType.no_check_in) {
    if (checkedIn) {
      return (
        <button
          type="button"
          disabled={isCheckOutPending}
          onClick={handleCheckOut}
          className={cn("btn btn-soft btn-error", className)}
          title={"Check out"}
        >
          Remove from calendar
        </button>
      );
    }

    if (event.capacity && signedPeople >= event.capacity) {
      return (
        <span className={cn("btn btn-disabled", className)}>
          No empty places
        </span>
      );
    }

    return (
      <button
        type="button"
        disabled={isCheckInPending}
        onClick={handleCheckIn}
        className={cn("btn btn-soft btn-success", className)}
        title={"Add to calendar"}
      >
        Add to calendar
      </button>
    );
  }

  if (checkedIn) {
    return (
      <button
        type="button"
        disabled={isCheckOutPending}
        onClick={handleCheckOut}
        className={cn("btn btn-soft btn-error", className)}
        title={"Check out"}
      >
        Check out
      </button>
    );
  }

  if (event.capacity && signedPeople >= event.capacity) {
    return (
      <span className={cn("btn btn-disabled", className)}>
        No empty places
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isCheckInPending}
      onClick={handleCheckIn}
      className={cn("btn btn-soft btn-success", className)}
      title={"Check in"}
    >
      Check in
    </button>
  );
}
