import Tooltip from "@/components/common/Tooltip.tsx";
import { $schedule } from "@/api/schedule";
import { queryClient } from "@/app/query-client.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useState } from "react";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client.ts";
import { useToast } from "@/components/toast";

export default function RemoveButtonLinked({
  alias,
  calendarName,
}: {
  alias: string;
  calendarName: string;
}) {
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

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
  const { showError } = useToast();

  const removeLinkedCalendar = () => {
    remove.mutate(
      {
        params: { query: { alias } },
      },
      {
        onError: (error) => {
          showError("Import failed", formatApiErrorMessage(error));
        },
      },
    );
  };

  return (
    <Tooltip content={"Remove this calendar"}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setRemoveModalOpen(true);
        }}
        className="text-base-content/50 hover:bg-base-200 hover:text-base-content/75 rounded-box -mr-2 flex h-10 w-10 items-center justify-center text-3xl"
      >
        <span className="icon-[material-symbols--delete-outline] text-error mt-0.5 mb-1 h-8 w-8" />
      </button>
      <Modal
        open={removeModalOpen}
        onOpenChange={setRemoveModalOpen}
        title={`Remove calendar ${calendarName}?`}
        overlayClassName={"bg-black/50"}
        containerClassName="bg-base-100"
      >
        <div className="mt-2 flex justify-between px-3">
          <button
            type="button"
            onClick={() => setRemoveModalOpen(false)}
            className="btn text-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              removeLinkedCalendar();
            }}
            className="btn btn-error text-md"
          >
            Remove
          </button>
        </div>
      </Modal>
    </Tooltip>
  );
}
