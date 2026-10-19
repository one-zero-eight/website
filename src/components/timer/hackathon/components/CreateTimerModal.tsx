import { Modal } from "@/components/common/Modal.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useHackathonTimers } from "../lib/useHackathonTimers";
import { createEmptyTimer } from "../utils";
import { TimelineEditor } from "./TimelineEditor";

export function CreateTimerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { addTimer } = useHackathonTimers();
  const [draft, setDraft] = useState(createEmptyTimer);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setDraft(createEmptyTimer());
    onOpenChange(isOpen);
  }

  function handleCreate() {
    addTimer(draft);
    handleOpenChange(false);
    navigate({ to: "/timer/hackathon/$id", params: { id: draft.id } });
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
        timer={draft}
        onTimerChange={setDraft}
        heading="Create timer"
        doneLabel="Create"
        onDone={handleCreate}
        onCancel={() => handleOpenChange(false)}
      />
    </Modal>
  );
}
