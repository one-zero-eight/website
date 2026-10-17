import { HackatonPlan, Milestone, toInputValue } from "./utils";

export function TimelineEditor({
  plan,
  onPlanChange,
  onDone,
}: {
  plan: HackatonPlan;
  onPlanChange: (plan: HackatonPlan) => void;
  onDone: () => void;
}) {
  function updateMilestone(id: string, changes: Partial<Milestone>) {
    onPlanChange({
      ...plan,
      milestones: plan.milestones.map((milestone) =>
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
    onPlanChange({
      ...plan,
      milestones: [...plan.milestones, newMilestone],
    });
  }

  function handleDeleteMilestone(id: string) {
    onPlanChange({
      ...plan,
      milestones: plan.milestones.filter((milestone) => milestone.id !== id),
    });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Edit timeline</h2>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          <span className="icon-[material-symbols--check]" />
          Done
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-base-content/70 text-sm">Title</span>
        <input
          type="text"
          className="input w-full"
          placeholder="Timer title"
          value={plan.title}
          onChange={(e) => onPlanChange({ ...plan, title: e.target.value })}
        />
      </label>

      <div className="grid gap-3 @lg/content:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Start</span>
          <input
            type="datetime-local"
            className="input w-full"
            value={plan.start}
            onChange={(e) => onPlanChange({ ...plan, start: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-base-content/70 text-sm">Finish</span>
          <input
            type="datetime-local"
            className="input w-full"
            value={plan.finish}
            onChange={(e) => onPlanChange({ ...plan, finish: e.target.value })}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {plan.milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="bg-base-200 rounded-box flex flex-col gap-2 p-3 @lg/content:flex-row @lg/content:items-center"
          >
            <input
              type="text"
              className="input w-full @lg/content:flex-1"
              placeholder="Milestone title"
              value={milestone.title}
              onChange={(e) =>
                updateMilestone(milestone.id, { title: e.target.value })
              }
            />
            <input
              type="datetime-local"
              className="input w-full @lg/content:w-auto"
              value={milestone.time}
              onChange={(e) =>
                updateMilestone(milestone.id, { time: e.target.value })
              }
            />
            <button
              type="button"
              className="btn btn-error btn-outline btn-square shrink-0 self-end @lg/content:self-auto"
              onClick={() => handleDeleteMilestone(milestone.id)}
            >
              <span className="icon-[material-symbols--delete-outline] text-xl" />
            </button>
          </div>
        ))}
        {plan.milestones.length === 0 && (
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
    </div>
  );
}
