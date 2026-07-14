import { useEffect, useState } from "react";

export function EditTitleButton({
  currentTitle,
  onSave,
}: {
  currentTitle: string;
  onSave: (newTitle: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(currentTitle);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  const handleBlur = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      setTitle(currentTitle);
      return;
    }

    setIsPending(true);
    try {
      await onSave(nextTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
      setTitle(currentTitle);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setTitle(currentTitle);
            e.currentTarget.blur();
          }
        }}
        disabled={isPending}
        size={Math.max(title.length, 1)}
        placeholder="Untitled"
        className="text-base-content placeholder:text-base-content/40 field-sizing-content max-w-full min-w-0 bg-transparent p-0 text-lg font-semibold outline-none disabled:opacity-50"
      />
      {isPending && (
        <span className="loading loading-spinner loading-sm shrink-0" />
      )}
    </div>
  );
}
