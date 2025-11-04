import { $workshops } from "@/api/workshops";
import { useToast } from "@/components/toast";
import {
  getInactiveStatusText,
  getSignedPeopleCount,
  isWorkshopActive,
} from "@/components/events/event-utils";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

export function CheckInButton({
  workshopId,
  className,
}: {
  workshopId: string;
  className?: string | undefined | null;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");

  const workshop = workshops?.find((w) => w.id === workshopId);
  const checkedIn = !!myCheckins?.some((w) => w.id === workshopId);
  const signedPeople = (workshop && getSignedPeopleCount(workshop)) || 0;

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
              params: { path: { workshop_id: workshopId } },
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
              params: { path: { workshop_id: workshopId } },
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
      params: { path: { workshop_id: workshopId } },
    });
  };

  const handleCheckOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isCheckOutPending) return;
    checkOut({
      params: { path: { workshop_id: workshopId } },
    });
  };

  if (!workshop) {
    return null;
  }

  if (!isWorkshopActive(workshop)) {
    return (
      <p className="dark:text-rose-80 w-fit transform rounded-lg border border-rose-600 bg-rose-700/10 px-4 py-2 text-center leading-normal font-medium text-rose-600 backdrop-blur-sm dark:border-rose-800">
        {getInactiveStatusText(workshop)}
      </p>
    );
  }

  if (signedPeople >= workshop.capacity) {
    return (
      <span
        className={clsx(
          "w-full rounded-lg border border-rose-800 bg-rose-700/10 px-4 py-2 text-rose-700",
          className,
        )}
      >
        No empty places
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={checkedIn ? isCheckOutPending : isCheckInPending}
      onClick={checkedIn ? handleCheckOut : handleCheckIn}
      className={clsx(
        "bg-primary/80 flex w-full cursor-pointer items-center justify-center rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50",
        checkedIn
          ? "border-[#ff6b6b]/20 text-[#ff6b6b] hover:border-[#ff5252]/40 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252]"
          : "border-green-700/30 text-green-700 hover:border-green-600/50 hover:bg-green-600/20 hover:text-green-600 dark:border-[#bcdfbc]/20 dark:text-[#bcdfbc] dark:hover:border-[#aad6aa]/40 dark:hover:bg-[rgba(167,202,167,0.2)] dark:hover:text-[#aad6aa]",
        className,
      )}
      title={checkedIn ? "Check out" : "Check in"}
    >
      <span className="text-xs font-medium sm:text-sm">
        {checkedIn ? "Check out" : "Check in"}
      </span>
    </button>
  );
}
