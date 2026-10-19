import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  FloatingPortal,
} from "@floating-ui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/ui/cn";
import { useHackathonTimers } from "../lib/useHackathonTimers";
import { isFinished } from "../utils";
import { CreateTimerModal } from "./CreateTimerModal";
import { JoinTimerModal } from "./JoinTimerModal";

export function TimersDropdown({ currentTimerId }: { currentTimerId: string }) {
  const { timers } = useHackathonTimers();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${availableHeight}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  function handleCreateClick() {
    setIsOpen(false);
    setIsCreateOpen(true);
  }

  function handleJoinClick() {
    setIsOpen(false);
    setIsJoinOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-lg"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <span className="icon-[material-symbols--timer-outline-rounded]" />
        Timers
        <span className="icon-[material-symbols--keyboard-arrow-down]" />
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="border-base-300 bg-base-100 rounded-box z-50 flex w-80 max-w-[calc(100vw-1rem)] flex-col gap-1 overflow-y-auto border p-2 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateClick}
              >
                <span className="icon-[material-symbols--add]" />
                Create
              </button>
              <button
                type="button"
                className="btn btn-primary btn-outline"
                onClick={handleJoinClick}
              >
                <span className="icon-[material-symbols--key-outline]" />
                Join
              </button>
            </div>
            {timers.map((timer) => (
              <Link
                key={timer.id}
                to="/timer/hackathon/$id"
                params={{ id: timer.id }}
                className={cn(
                  "hover:bg-base-300 rounded-field flex items-center justify-between gap-2 px-3 py-2",
                  timer.id === currentTimerId && "bg-base-200 font-semibold",
                )}
                onClick={() => setIsOpen(false)}
              >
                <span className="min-w-0 truncate">{timer.title}</span>
                {isFinished(timer) && (
                  <span className="badge badge-error badge-outline badge-sm shrink-0">
                    Finished
                  </span>
                )}
              </Link>
            ))}
          </div>
        </FloatingPortal>
      )}

      <CreateTimerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <JoinTimerModal open={isJoinOpen} onOpenChange={setIsJoinOpen} />
    </>
  );
}
