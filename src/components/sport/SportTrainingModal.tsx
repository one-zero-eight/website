import { $sport } from "@/api/sport";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { useToast } from "@/components/toast";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useRef } from "react";
import { formatTimeRangeMoscow } from "@/components/sport/sport-week-utils.ts";

function invalidateSportSchedule(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "sport" &&
      q.queryKey[2] === "/users/me/schedule",
  });
}

function invalidateStudentHours(
  client: ReturnType<typeof useQueryClient>,
  studentId: number,
) {
  client.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/students/{student_id}/hours-summary",
      { params: { path: { student_id: studentId } } },
    ).queryKey,
  });
}

export function SportTrainingModal({
  open,
  onOpenChange,
  row,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemaTrainingInfoPersonalSchema | null;
  studentId: number;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);

  const { context, refs } = useFloating({ open, onOpenChange });
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);
  const dismiss = useDismiss(context, { capture: true });
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const { mutate: setCheckin, isPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSettled: () => {
        invalidateSportSchedule(queryClient);
        invalidateStudentHours(queryClient, studentId);
      },
      onSuccess: (_, vars) => {
        const checkin = vars.params.query.checkin;
        showSuccess(
          checkin ? "Checked in" : "Check-in cancelled",
          checkin
            ? "You are signed up for this training."
            : "You are no longer signed up.",
        );
        onOpenChange(false);
      },
      onError: () => {
        showError(
          "Could not update check-in",
          "Please try again or use the Telegram bot.",
        );
      },
    },
  );

  if (!isMounted || !row) {
    return null;
  }

  const t = row.training;
  const title = sportTrainingTitle(row);
  const when = new Date(t.start);
  const dateStr = when.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
  const timeStr = formatTimeRangeMoscow(t.start, t.end);

  const placesFree = Math.max(0, t.max_checkins - t.checkins_count);
  const isFull = t.checkins_count >= t.max_checkins;

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-20 grid place-items-center bg-black/75"
        lockScroll
        onClick={(e) => e.stopPropagation()}
      >
        <FloatingFocusManager context={context} initialFocus={closeRef} modal>
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex max-h-[min(90vh,720px)] w-full max-w-lg p-4"
          >
            <div className="bg-base-200 rounded-box flex max-h-full w-full flex-col overflow-hidden">
              <div className="border-b-base-300 flex shrink-0 items-start justify-between gap-2 border-b p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold wrap-break-word">
                    {title}
                  </h2>
                  <span
                    className={clsx(
                      "badge badge-sm",
                      t.is_paid ? "badge-warning" : "badge-success",
                    )}
                  >
                    {t.is_paid ? "Paid" : "Free"}
                  </span>
                  {t.is_accredited ? (
                    <span className="badge badge-info badge-sm">
                      Accredited
                    </span>
                  ) : null}
                  {t.is_club ? (
                    <span className="badge badge-secondary badge-sm">Club</span>
                  ) : null}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box flex h-10 w-10 shrink-0 items-center justify-center"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  <span className="icon-[material-symbols--close] text-2xl" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-base-content/60 font-semibold">
                      Time & date
                    </dt>
                    <dd>
                      {timeStr}, {dateStr}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-base-content/60 font-semibold">
                      Places
                    </dt>
                    <dd>
                      {placesFree} / {t.max_checkins} free
                      {isFull ? " (full)" : ""}
                    </dd>
                  </div>
                  {t.training_location ? (
                    <div>
                      <dt className="text-base-content/60 font-semibold">
                        Location
                      </dt>
                      <dd>{t.training_location.name}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="border-t-base-300 flex shrink-0 flex-wrap gap-2 border-t p-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={isPending}
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </button>
                {row.checked_in ? (
                  <button
                    type="button"
                    className="btn btn-error btn-outline"
                    disabled={isPending}
                    onClick={() =>
                      setCheckin({
                        params: {
                          path: { training_id: t.id },
                          query: { checkin: false },
                        },
                      })
                    }
                  >
                    Cancel check-in
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isPending || !row.can_check_in || isFull}
                    title={
                      !row.can_check_in
                        ? "Check-in not available for this session"
                        : isFull
                          ? "No free places"
                          : undefined
                    }
                    onClick={() =>
                      setCheckin({
                        params: {
                          path: { training_id: t.id },
                          query: { checkin: true },
                        },
                      })
                    }
                  >
                    Check in
                  </button>
                )}
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
