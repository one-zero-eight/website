import { MODE_LABELS } from "./consts";

interface ModeToggleProps {
  mode: "create" | "copy";
  onChange: (mode: "create" | "copy") => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex gap-2 rounded-lg border-2 border-contrast/20 p-1">
      <button
        type="button"
        onClick={() => onChange("create")}
        className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${
          mode === "create"
            ? "bg-brand-violet text-white"
            : "text-contrast/70 hover:bg-primary/5"
        }`}
      >
        {MODE_LABELS.create}
      </button>
      <button
        type="button"
        onClick={() => onChange("copy")}
        className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${
          mode === "copy"
            ? "bg-brand-violet text-white"
            : "text-contrast/70 hover:bg-primary/5"
        }`}
      >
        {MODE_LABELS.copy}
      </button>
    </div>
  );
}
