import { MODE_LABELS } from "./consts";

interface ModeToggleProps {
  mode: "create" | "copy";
  onChange: (mode: "create" | "copy") => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="border-base-content/20 rounded-field flex gap-2 border-2 p-1">
      <button
        type="button"
        onClick={() => onChange("create")}
        className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${
          mode === "create"
            ? "bg-primary text-white"
            : "text-base-content/70 hover:bg-inh-primary/5"
        }`}
      >
        {MODE_LABELS.create}
      </button>
      <button
        type="button"
        onClick={() => onChange("copy")}
        className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${
          mode === "copy"
            ? "bg-primary text-white"
            : "text-base-content/70 hover:bg-inh-primary/5"
        }`}
      >
        {MODE_LABELS.copy}
      </button>
    </div>
  );
}
