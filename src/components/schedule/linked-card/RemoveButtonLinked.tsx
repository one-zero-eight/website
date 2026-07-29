import Tooltip from "@/components/common/Tooltip.tsx";
import { $schedule } from "@/api/schedule";
import { queryClient } from "@/app/query-client.ts";

export default function RemoveButtonLinked({ alias }: { alias: string }) {
  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });

  const remove = $schedule.useMutation("delete", "/users/me/linked", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (prev) => {
          if (prev === undefined) return prev;
          return {
            ...prev,
            linked_calendars: Object.fromEntries(
              Object.entries(prev.linked_calendars ?? {}).filter(
                ([k, _]) => k !== params.query.alias,
              ),
            ),
          };
        },
      );
    },
    onSettled,
  });

  const removeLinkedCalendar = () => {
    remove.mutate({
      params: { query: { alias } },
    });
  };

  return (
    <Tooltip content={"Remove this calendar"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          removeLinkedCalendar();
        }}
        className="text-base-content/50 hover:bg-base-200 hover:text-base-content/75 rounded-box -mr-2 flex h-10 w-10 items-center justify-center text-3xl"
      >
        <span className="icon-[material-symbols--delete-outline] text-error mt-0.5 mb-1 h-8 w-8" />
      </button>
    </Tooltip>
  );
}
