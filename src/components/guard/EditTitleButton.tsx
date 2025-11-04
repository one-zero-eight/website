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
          className="border-base-content/20 bg-inh-primary/5 focus:border-primary flex-1 rounded-sm border-2 px-2 py-1 text-base outline-hidden transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !title.trim()}
          className="rounded-field border-2 border-green-500 px-2 py-1 text-sm font-medium text-green-500 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "..." : "✓"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-2 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
        className="text-base-content/60 hover:bg-inh-primary/10 hover:text-base-content rounded-sm px-2 py-1 text-sm"
        title="Edit title"
      >
        <span className="icon-[material-symbols--edit] text-base" />
      </button>
    </div>
  );
}
