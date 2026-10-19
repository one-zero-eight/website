import { CopyCodeButton } from "./CopyCodeButton";
import { DateTimeInput } from "./DateTimeInput";
import { useHackathonTimers } from "../lib/useHackathonTimers";
import {
  generateJoinCode,
  HackathonTimer,
  Milestone,
  toInputValue,
} from "../utils";

export function TimelineEditor({
  timer,
  onTimerChange,
  heading,
  doneLabel,
  onDone,
  onCancel,
  onDelete,
}: {
  timer: HackathonTimer;
  onTimerChange: (timer: HackathonTimer) => void;
  heading: string;
  doneLabel: string;
  onDone: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const { timers } = useHackathonTimers();

  function updateMilestone(id: string, changes: Partial<Milestone>) {
    onTimerChange({
      ...timer,
      milestones: timer.milestones.map((milestone) =>
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
    onTimerChange({
      ...timer,
      milestones: [...timer.milestones, newMilestone],
    });
  }

  function handleDeleteMilestone(id: string) {
    onTimerChange({
      ...timer,
      milestones: timer.milestones.filter((milestone) => milestone.id !== id),
    });
  }

  function handleCreateJoinCode() {
    const takenCodes = timers.map((item) => item.joinCode);
    onTimerChange({ ...timer, joinCode: generateJoinCode(takenCodes) });
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
            disabled={!timer.title.trim()}
            onClick={onDone}
          >
            <span className="icon-[material-symbols--check]" />
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
          value={timer.title}
          onChange={(e) => onTimerChange({ ...timer, title: e.target.value })}
        />
      </label>

      <div className="grid gap-3 @lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Start</span>
          <DateTimeInput
            value={timer.start}
            onChange={(start) => onTimerChange({ ...timer, start })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Finish</span>
          <DateTimeInput
            value={timer.finish}
            onChange={(finish) => onTimerChange({ ...timer, finish })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base-content/70 text-sm">Join code</span>
        {timer.joinCode ? (
          <div className="flex items-center gap-3">
            <CopyCodeButton code={timer.joinCode} />
            <span className="text-base-content/70 text-sm">
              Anyone with this code can join the timer
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCreateJoinCode}
            >
              <span className="icon-[material-symbols--key-outline]" />
              Create join code
            </button>
            <span className="text-base-content/70 text-sm">
              The timer is private until you create a code
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {timer.milestones.map((milestone) => (
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
        {timer.milestones.length === 0 && (
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
