import { $schedule } from "@/api/schedule";
import { TargetForExport } from "@/api/schedule/types.ts";
import { useQueryClient } from "@tanstack/react-query";
import HideButtonUI from "@/components/schedule/HideButtonUI.tsx";

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
    <HideButtonUI
      isHidden={isHidden}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        switchHideFavorite?.();
      }}
    />
  );
}
