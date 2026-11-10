import { $timer } from "@/api/timer";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRefreshTimers } from "../lib/useHackathonTimers";
import { createEmptyDraft, toTimerBody } from "../utils";
import { TimelineEditor } from "./TimelineEditor";

export function CreateTimerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { showError } = useToast();
  const refreshTimers = useRefreshTimers();
  const [draft, setDraft] = useState(createEmptyDraft);

  const { mutate: createTimer, isPending } = $timer.useMutation(
    "post",
    "/timers",
    {
      onSuccess: refreshTimers,
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setDraft(createEmptyDraft());
    onOpenChange(isOpen);
  }

  function handleCreate() {
    createTimer(
      { body: toTimerBody(draft) },
      {
        onSuccess: (createdTimer) => {
          handleOpenChange(false);
          navigate({
            to: "/timer/hackathon/$id",
            params: { id: String(createdTimer.id) },
          });
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      hideHeader
      closeOnOutsidePress={false}
      containerClassName="max-w-3xl"
    >
      <TimelineEditor
        draft={draft}
        onDraftChange={setDraft}
        heading="Create timer"
        doneLabel="Create"
        isSaving={isPending}
        onDone={handleCreate}
        onCancel={() => handleOpenChange(false)}
      />
    </Modal>
  );
}
