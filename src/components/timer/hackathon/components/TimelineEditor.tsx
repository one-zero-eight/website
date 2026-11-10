import {
  isDraftValid,
  isFinishAfterStart,
  Milestone,
  TimerDraft,
  toInputValue,
} from "../utils";
import { DateTimeInput } from "./DateTimeInput";

export function TimelineEditor({
  draft,
  onDraftChange,
  heading,
  doneLabel,
  isSaving,
  onDone,
  onCancel,
  onDelete,
}: {
  draft: TimerDraft;
  onDraftChange: (draft: TimerDraft) => void;
  heading: string;
  doneLabel: string;
  isSaving: boolean;
  onDone: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  function updateMilestone(id: string, changes: Partial<Milestone>) {
    onDraftChange({
      ...draft,
      milestones: draft.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...changes } : milestone,
      ),
    });
  }

  function handleAddMilestone() {
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      title: "",
      time: toInputValue(new Date()),
    };
    onDraftChange({
      ...draft,
      milestones: [...draft.milestones, newMilestone],
    });
  }

  function handleDeleteMilestone(id: string) {
    onDraftChange({
      ...draft,
      milestones: draft.milestones.filter((milestone) => milestone.id !== id),
    });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isDraftValid(draft) || isSaving}
            onClick={onDone}
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <span className="icon-[material-symbols--check]" />
            )}
            {doneLabel}
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-base-content/70 text-sm">Title</span>
        <input
          type="text"
          className="input w-full"
          placeholder="Timer title"
          value={draft.title}
          onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
        />
      </label>

      <div className="grid gap-3 @lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Start</span>
          <DateTimeInput
            value={draft.start}
            onChange={(start) => onDraftChange({ ...draft, start })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Finish</span>
          <DateTimeInput
            value={draft.finish}
            onChange={(finish) => onDraftChange({ ...draft, finish })}
          />
        </div>
      </div>

      {!isFinishAfterStart(draft) && (
        <p className="text-error">Finish must be after start</p>
      )}

      <div className="flex flex-col gap-2">
        {draft.milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="bg-base-200 rounded-box flex items-center gap-2 p-3"
          >
            <div className="flex min-w-0 grow flex-col gap-2 @lg:flex-row">
              <input
                type="text"
                className="input w-full @lg:flex-1"
                placeholder="Milestone title"
                value={milestone.title}
                onChange={(e) =>
                  updateMilestone(milestone.id, { title: e.target.value })
                }
              />
              <DateTimeInput
                className="@lg:w-60"
                value={milestone.time}
                onChange={(time) => updateMilestone(milestone.id, { time })}
              />
            </div>
            <button
              type="button"
              className="btn btn-error btn-outline btn-square shrink-0"
              onClick={() => handleDeleteMilestone(milestone.id)}
            >
              <span className="icon-[material-symbols--delete-outline] text-xl" />
            </button>
          </div>
        ))}
        {draft.milestones.length === 0 && (
          <p className="text-base-content/60">No milestones yet</p>
        )}
      </div>

      <button
        type="button"
        className="btn btn-outline btn-primary self-start"
        onClick={handleAddMilestone}
      >
        <span className="icon-[material-symbols--add]" />
        Add milestone
      </button>

      {onDelete && (
        <button
          type="button"
          className="btn btn-error btn-outline mt-4 self-start"
          onClick={onDelete}
        >
          <span className="icon-[material-symbols--delete-outline]" />
          Delete timer
        </button>
      )}
    </div>
  );
}
