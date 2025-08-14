import { $workshops } from "@/api/workshops";
import { useToast } from "@/components/toast";
import {
  getInactiveStatusText,
  getSignedPeopleCount,
  isWorkshopActive,
} from "@/components/workshops/workshop-utils.ts";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

export function CheckInButton({ workshopId }: { workshopId: string }) {
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
          "You have successfully checked-in for this workshop.",
        );
      },
      onError: () => {
        showError(
          "Check-in Failed",
          "Failed to check in. Please try again. Probably you have overlapping workshops",
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
          "You have successfully checked-out from this workshop.",
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
      <p
        className={clsx(
          "w-fit transform rounded-2xl border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.15)] text-center font-medium leading-normal text-[#ff6b6b] backdrop-blur-[8px] dark:border-[rgba(255,107,107,0.3)] dark:bg-[rgba(255,107,107,0.15)]",
          "px-1 py-1 text-[10px] sm:bottom-3 sm:px-2 sm:py-1.5 sm:text-sm",
        )}
      >
        {getInactiveStatusText(workshop)}
      </p>
    );
  }

  if (checkedIn) {
    return (
      <button
        type="button"
        onClick={handleCheckOut}
        disabled={isCheckOutPending}
        className="flex w-fit cursor-pointer items-center justify-center rounded-2xl border border-[#ff6b6b]/20 bg-primary/80 px-2 py-1 text-[#ff6b6b] hover:border-[#ff5252]/40 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252] disabled:cursor-not-allowed disabled:opacity-50"
        title="Check out"
      >
        <span className="text-xs font-medium sm:text-sm">Check out</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={signedPeople >= workshop.capacity || isCheckInPending}
      onClick={handleCheckIn}
      className="flex w-fit cursor-pointer items-center justify-center rounded-2xl border border-green-700/30 bg-primary/80 px-2 py-1 text-green-700 hover:border-green-600/50 hover:bg-green-600/20 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#bcdfbc]/20 dark:text-[#bcdfbc] dark:hover:border-[#aad6aa]/40 dark:hover:bg-[rgba(167,202,167,0.2)] dark:hover:text-[#aad6aa]"
      title="Check in"
    >
      <span className="text-xs font-medium sm:text-sm">Check in</span>
    </button>
  );
}
