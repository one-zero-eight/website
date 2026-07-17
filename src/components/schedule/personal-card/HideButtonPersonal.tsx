import Tooltip from "@/components/common/Tooltip";
import { $schedule } from "@/api/schedule";
import { TargetForExport } from "@/api/schedule/types.ts";
import { useQueryClient } from "@tanstack/react-query";

export default function HideButtonPersonal({
  target,
}: {
  target: TargetForExport;
}) {
  const queryClient = useQueryClient();
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");

  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });

  let isHidden = false;
  if (target === TargetForExport.sport) {
    isHidden = scheduleUser?.sports_hidden ?? false;
  } else if (target === TargetForExport.moodle) {
    isHidden = scheduleUser?.moodle_hidden ?? false;
  } else if (target === TargetForExport.music_room) {
    isHidden = scheduleUser?.music_room_hidden ?? false;
  } else if (target === TargetForExport.workshops) {
    isHidden = scheduleUser?.workshops_hidden ?? false;
  } else if (target === TargetForExport.room_bookings) {
    isHidden = scheduleUser?.room_bookings_hidden ?? false;
  }

  const hide = $schedule.useMutation("post", "/users/me/{target}/hide", {
    onMutate: ({ params }) => {
      console.log(params);
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (prev) => {
          if (prev === undefined) return prev;
          const patch: {
            sports_hidden?: boolean;
            moodle_hidden?: boolean;
            music_room_hidden?: boolean;
          } = {};

          if (params.path.target == TargetForExport.sport) {
            patch.sports_hidden = params.query?.hide;
          } else if (params.path.target == TargetForExport.moodle) {
            patch.moodle_hidden = params.query?.hide;
          } else if (params.path.target == TargetForExport.music_room) {
            patch.music_room_hidden = params.query?.hide;
          }

          return {
            ...prev,
            ...patch,
          };
        },
      );
    },
    onSettled,
  });

  const switchHideFavorite = () => {
    hide.mutate({
      params: { query: { hide: !isHidden }, path: { target: target } },
    });
  };

  return (
    <Tooltip content={isHidden ? "Hidden from calendar" : "Hide from calendar"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          switchHideFavorite?.();
        }}
        className="hover:bg-base-200 rounded-box flex h-10 w-10 items-center justify-center text-3xl"
      >
        {isHidden ? (
          <span className="icon-[material-symbols--visibility-off-outline] text-base-content/50" />
        ) : (
          <span className="icon-[material-symbols--visibility-outline] text-base-content/50" />
        )}
      </button>
    </Tooltip>
  );
}
