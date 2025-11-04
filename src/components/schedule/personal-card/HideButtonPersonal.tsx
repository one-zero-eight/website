import Tooltip from "@/components/common/Tooltip";
import { $events, eventsTypes } from "@/api/events";
import { PathsUsersMeTargetHidePostParametersPathTarget as Type } from "@/api/events/types.ts";
import { useQueryClient } from "@tanstack/react-query";

export default function HideButtonPersonal({ target }: { target: Type }) {
  const queryClient = useQueryClient();
  const { data: eventsUser } = $events.useQuery("get", "/users/me");

  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $events.queryOptions("get", "/users/me").queryKey,
    });

  let isHidden = false;
  if (target == Type.sports) {
    isHidden = eventsUser?.sports_hidden ?? false;
  } else if (target == Type.moodle) {
    isHidden = eventsUser?.moodle_hidden ?? false;
  } else if (target == Type.music_room) {
    isHidden = eventsUser?.music_room_hidden ?? false;
  }

  const hide = $events.useMutation("post", "/users/me/{target}/hide", {
    onMutate: ({ params }) => {
      console.log(params);
      queryClient.setQueryData(
        $events.queryOptions("get", "/users/me").queryKey,
        (prev: eventsTypes.SchemaViewUser) => {
          if (prev === undefined) return prev;
          const patch: {
            sports_hidden?: boolean;
            moodle_hidden?: boolean;
            music_room_hidden?: boolean;
          } = {};

          if (params.path.target == Type.sports) {
            patch.sports_hidden = params.query?.hide;
          } else if (params.path.target == Type.moodle) {
            patch.moodle_hidden = params.query?.hide;
          } else if (params.path.target == Type.music_room) {
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
        className="hover:bg-inh-secondary-hover rounded-box flex h-12 w-12 items-center justify-center text-4xl"
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
