import { cn } from "@/lib/ui/cn";
import { ButtonHTMLAttributes, MouseEvent, useState } from "react";
import { CreationDialog } from "./CreationModal/CreationDialog.tsx";

export function CreateMeetingButton({
  className,
  children,
  onClick,
  onCreated,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  onCreated?: () => void;
}) {
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    setCreationDialogOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className={cn("btn btn-primary gap-1.5", children && "pr-3", className)}
        title="Create new meeting"
        onClick={handleClick}
        {...props}
      >
        <span className="icon-[material-symbols--add] shrink-0 text-xl" />
        {children ?? "Create meeting"}
      </button>
      <CreationDialog
        open={creationDialogOpen}
        onOpenChange={setCreationDialogOpen}
        onCreated={onCreated}
      />
    </>
  );
}
