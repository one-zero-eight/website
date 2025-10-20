import { useState } from "react";

interface EditTitleButtonProps {
  currentTitle: string;
  onSave: (newTitle: string) => Promise<void>;
}

export function EditTitleButton({
  currentTitle,
  onSave,
}: EditTitleButtonProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || title === currentTitle) {
      setIsEditing(false);
      setTitle(currentTitle);
      return;
    }

    setIsPending(true);
    try {
      await onSave(title.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update title:", error);
      setTitle(currentTitle);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle(currentTitle);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
          autoFocus
          disabled={isPending}
          className="flex-1 rounded border-2 border-contrast/20 bg-primary/5 px-2 py-1 text-base outline-none transition-colors focus:border-brand-violet disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !title.trim()}
          className="rounded-lg border-2 border-green-500 px-2 py-1 text-sm font-medium text-green-500 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "..." : "✓"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-lg border-2 border-contrast/20 px-2 py-1 text-sm font-medium hover:border-contrast/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h3 className="truncate text-lg">{currentTitle || "Untitled"}</h3>
      <button
        onClick={() => setIsEditing(true)}
        className="rounded px-2 py-1 text-sm text-contrast/60 hover:bg-primary/10 hover:text-contrast"
        title="Edit title"
      >
        <span className="icon-[material-symbols--edit] text-base" />
      </button>
    </div>
  );
}
