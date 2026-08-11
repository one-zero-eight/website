import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { EnrollmentType, ModerationStatus } from "@/api/workshops/types";
import Tooltip from "@/components/common/Tooltip.tsx";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventHeroImage } from "../shared/EventHeroImage";
import { StoredHostsList } from "../shared/HostLink";
import { eventFieldClass } from "../shared/formStyles";
import { formatEventDateRange, getEventEndsAt } from "../utils/datetime";
import { parseDescriptionContent } from "../utils/description";
import { getLinkDisplayLabel, getSubmissionImageUrl } from "../utils/links";

export function SubmissionPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError, showConfirm } = useToast();
  const { isModerator, clubs, isPending: isAuthPending } = useEventsAuth();
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/submissions/{id}",
    { params: { path: { id } } },
    { enabled: isModerator },
  );

  const locales = useMemo(
    () => Object.keys(data?.submission.data.locales ?? {}),
    [data?.submission.data.locales],
  );

  useEffect(() => {
    if (!isAuthPending && !isModerator) {
      navigate({ to: "/events" });
    }
  }, [isModerator, isAuthPending, navigate]);

  useEffect(() => {
    if (locales.length === 0) {
      setSelectedLocale(null);
      return;
    }

    if (!selectedLocale || !locales.includes(selectedLocale)) {
      setSelectedLocale(locales[0] ?? null);
    }
  }, [locales, selectedLocale]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/submissions/{id}", {
        params: { path: { id } },
      }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/submissions/").queryKey,
    });
  };

  const { mutate: approve, isPending: isApproving } = $workshops.useMutation(
    "post",
    "/submissions/{id}/approve",
    {
      onSuccess: () => {
        invalidate();
        navigate({ to: "/events/submissions" });
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    },
  );

  const { mutate: decline, isPending: isDeclining } = $workshops.useMutation(
    "post",
    "/submissions/{id}/decline",
    {
      onSuccess: () => {
        invalidate();
        navigate({ to: "/events/submissions" });
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    },
  );

  if (isAuthPending || isPending) {
    return (
      <div className="@container/content px-4 pt-6 pb-4">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-4 @min-[700px]/content:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="skeleton aspect-video rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isModerator) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-4">
        <p className="text-error mb-2">
          {formatApiErrorMessage(error) || "Failed to load submission."}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const event = data.submission.data;
  const moderation = data.submission.moderation;
  const isPendingReview = moderation.status === ModerationStatus.pending;
  const localeContent = selectedLocale
    ? event.locales[selectedLocale]
    : undefined;
  const feedbackTrimmed = feedback.trim();
  const declineDisabled = !feedbackTrimmed || isDeclining || isApproving;
  const visibleLinks = (event.links ?? []).filter((link) => link.url.trim());
  const endsAt = getEventEndsAt(event.starts_at, event.duration_hours);
  const locationLabel = event.location?.trim() || "TBA";
  const title = localeContent?.name?.trim() || "Untitled event";
  const enrollment = event.enrollment;
  const isExternal = enrollment?.type === EnrollmentType.external;
  const capacity = enrollment?.capacity;
  const enrollmentLabel = !enrollment
    ? null
    : isExternal
      ? "External"
      : capacity !== null && capacity !== undefined
        ? `On InNoHassle · ${capacity} participants`
        : "On InNoHassle · unlimited";

  async function handleApprove() {
    const confirmed = await showConfirm({
      title: "Approve submission",
      message: "Publish this event? This cannot be undone from here.",
      confirmText: "Approve",
      cancelText: "Cancel",
      type: "info",
    });
    if (!confirmed) {
      return;
    }

    approve({
      params: { path: { id } },
      body: { feedback: feedbackTrimmed },
    });
  }

  async function handleDecline() {
    const confirmed = await showConfirm({
      title: "Decline submission",
      message: "Decline this submission with the feedback you entered?",
      confirmText: "Decline",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) {
      return;
    }

    decline({
      params: { path: { id } },
      body: { feedback: feedbackTrimmed },
    });
  }

  return (
    <div className="@container/content px-4 pt-6 pb-4">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-4 @min-[700px]/content:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="border-base-300 rounded-2xl border p-4 @min-[700px]/content:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {locales.map((locale) => (
              <button
                key={locale}
                type="button"
                className={cn(
                  "btn btn-sm uppercase",
                  selectedLocale === locale
                    ? "btn-primary"
                    : "btn-ghost border border-dashed",
                )}
                onClick={() => setSelectedLocale(locale)}
              >
                {locale}
              </button>
            ))}
            <h1 className="text-2xl font-medium wrap-anywhere">{title}</h1>
          </div>

          <ul className="mb-6 flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="icon-[material-symbols--schedule-outline] shrink-0 text-xl" />
              <span>{formatEventDateRange(event.starts_at, endsAt)}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="icon-[material-symbols--person-outline] shrink-0 text-xl" />
              <div className="min-w-0">
                <StoredHostsList hosts={event.hosts ?? []} clubs={clubs} />
              </div>
            </li>
            <li className="flex items-center gap-2">
              <span className="icon-[material-symbols--location-on-outline] shrink-0 text-xl" />
              {locationLabel.toUpperCase() === "TBA" ||
              locationLabel.toUpperCase() === "ONLINE" ||
              locationLabel.toUpperCase() === "ОНЛАЙН" ? (
                <span>{locationLabel}</span>
              ) : (
                <Link
                  to="/maps"
                  search={{ q: locationLabel }}
                  className="underline underline-offset-2"
                >
                  {locationLabel}
                </Link>
              )}
            </li>
            {enrollmentLabel && (
              <li className="flex items-center gap-2">
                <span className="icon-[material-symbols--how-to-reg-outline] shrink-0 text-xl" />
                {isExternal && enrollment?.url ? (
                  <a
                    href={enrollment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {enrollmentLabel}
                  </a>
                ) : (
                  <span>{enrollmentLabel}</span>
                )}
              </li>
            )}
          </ul>

          <DescriptionViewer
            content={parseDescriptionContent(localeContent?.description)}
            className="text-base-content/80"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <EventHeroImage
            src={event.image_id ? getSubmissionImageUrl(id) : null}
          />

          <div className="border-base-300 rounded-2xl border p-4">
            <h2 className="mb-3 font-medium">Links</h2>
            {visibleLinks.length === 0 ? (
              <p className="text-base-content/70 text-sm">No links.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {visibleLinks.map((link) => (
                  <li key={link.id} className="flex items-start gap-3">
                    <span className="bg-base-content mt-1.5 size-2 shrink-0 rounded-full" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 wrap-anywhere underline underline-offset-2"
                    >
                      {getLinkDisplayLabel(link)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-base-300 rounded-2xl border p-4">
            {isPendingReview ? (
              <>
                <p className="mb-2 text-sm font-medium">
                  Leave your feedback and judge
                </p>
                <textarea
                  className={eventFieldClass("mb-3 min-h-28 resize-y")}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  {declineDisabled && !feedbackTrimmed ? (
                    <Tooltip content="Cannot decline without feedback">
                      <span className="inline-flex">
                        <button
                          type="button"
                          className="btn btn-error btn-sm btn-disabled pointer-events-none"
                          disabled
                        >
                          Decline
                        </button>
                      </span>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-error btn-sm"
                      disabled={declineDisabled}
                      onClick={handleDecline}
                    >
                      {isDeclining && (
                        <span className="loading loading-spinner loading-sm" />
                      )}
                      Decline
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={isApproving || isDeclining}
                    onClick={handleApprove}
                  >
                    {isApproving && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    Approve
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <p className="font-medium capitalize">{moderation.status}</p>
                <p className="text-base-content/70">
                  {moment(moderation.updated_at).format("D MMM YYYY, HH:mm")}
                </p>
                {moderation.feedback?.trim() ? (
                  <p className="text-base-content/80 whitespace-pre-wrap">
                    {moderation.feedback}
                  </p>
                ) : (
                  <p className="text-base-content/70">No feedback.</p>
                )}
                {moderation.status === ModerationStatus.approved && (
                  <Link
                    to="/events/p/$id"
                    params={{ id }}
                    className="link link-primary mt-1"
                  >
                    Open event publication
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
