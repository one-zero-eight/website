import HideButtonUI from "@/components/schedule/HideButtonUI.tsx";
import { $schedule, scheduleTypes } from "@/api/schedule";
import { useQueryClient } from "@tanstack/react-query";

export default function HideButtonLinked({ alias }: { alias: string }) {
  const queryClient = useQueryClient();
  const { data: eventsUser } = $schedule.useQuery("get", "/users/me");
  const isHidden = !(eventsUser?.linked_calendars?.[alias].is_active ?? true);

  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });

  const hide = $schedule.useMutation("post", "/users/me/linked/hide", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (prev) => {
          if (prev === undefined) return prev;

          const alias = params.query.alias;
          const is_active = !params.query?.hide;

          const patch: {
            linked_calendars: Record<
              string,
              scheduleTypes.SchemaLinkedCalendarView
            >;
          } = {
            linked_calendars: { ...prev.linked_calendars },
          };

          patch.linked_calendars[alias] = {
            ...patch.linked_calendars[alias],
            is_active: is_active,
          };

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
      params: { query: { hide: !isHidden, alias } },
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
