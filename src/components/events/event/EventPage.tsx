import { useMe } from "@/api/accounts/user.ts";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { EnrollmentType } from "@/api/workshops/types";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventHeroImage } from "../shared/EventHeroImage";
import { PublicHostsList } from "../shared/HostLink";
import { LocationLink } from "../shared/LocationLink";
import { formatEventDateRange, getEventEndsAt } from "../utils/datetime";
import { parseDescriptionContent } from "../utils/description";
import { getEventImageUrl, getLinkDisplayLabel } from "../utils/links";
import { EnrolledListModal } from "./EnrolledListModal";

export function EventPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { me } = useMe();
  const { isModerator } = useEventsAuth();
  const { showError, showConfirm } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [enrolledOpen, setEnrolledOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/events/{id}",
    { params: { path: { id } } },
  );

  const locales = useMemo(
    () => Object.keys(data?.data.locales ?? {}),
    [data?.data.locales],
  );

  useEffect(() => {
    if (locales.length === 0) {
      setSelectedLocale(null);
      return;
    }

    if (!selectedLocale || !locales.includes(selectedLocale)) {
      setSelectedLocale(locales[0] ?? null);
    }
  }, [locales, selectedLocale]);

  const invalidateEvent = () => {
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/events/{id}", {
        params: { path: { id } },
      }).queryKey,
    });
  };

  const { mutate: enroll, isPending: isEnrolling } = $workshops.useMutation(
    "post",
    "/events/{id}/enroll",
    {
      onSuccess: () => {
        invalidateEvent();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    },
  );

  const { mutate: unenroll, isPending: isUnenrolling } = $workshops.useMutation(
    "post",
    "/events/{id}/unenroll",
    {
      onSuccess: () => {
        invalidateEvent();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    },
  );

  const { mutate: unpublish, isPending: isUnpublishing } =
    $workshops.useMutation("delete", "/events/{id}", {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/submissions/").queryKey,
        });
        navigate({ to: "/events" });
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  async function handleUnpublish() {
    const confirmed = await showConfirm({
      title: "Unpublish event",
      message:
        "Remove this event from the public calendar? This cannot be undone from here.",
      confirmText: "Unpublish",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) {
      return;
    }

    unpublish({ params: { path: { id } } });
  }

  if (isPending) {
    return (
      <div className="@container/content px-4 py-4">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-4 @min-[700px]/content:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="skeleton aspect-video rounded-2xl @min-[700px]/content:col-start-2 @min-[700px]/content:row-start-1" />
          <div className="skeleton h-64 rounded-2xl @min-[700px]/content:col-start-1 @min-[700px]/content:row-span-2 @min-[700px]/content:row-start-1" />
          <div className="flex flex-col gap-4 @min-[700px]/content:col-start-2 @min-[700px]/content:row-start-2">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    if (isApiHttpError(error) && (error.httpCode as number) === 404) {
      return <Navigate to="/events" />;
    }

    return (
      <div className="px-4 py-4">
        <p className="text-error mb-2">
          {formatApiErrorMessage(error) || "Failed to load event."}
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

  const localeContent = selectedLocale
    ? data.data.locales[selectedLocale]
    : undefined;
  const enrollment = data.data.enrollment;
  const isExternal = enrollment.type === EnrollmentType.external;
  const capacity = enrollment.capacity;
  const atCapacity =
    !isExternal &&
    capacity !== null &&
    capacity !== undefined &&
    data.enrolled_count >= capacity;
  const enrolledEmails = data.enrolled_emails ?? null;
  const actionPending = isEnrolling || isUnenrolling;
  const endsAt = getEventEndsAt(data.data.starts_at, data.data.duration_hours);
  const visibleLinks = (data.data.links ?? []).filter((link) =>
    link.url.trim(),
  );
  const title = localeContent?.name?.trim() || "Untitled event";
  const enrollmentHost = (() => {
    if (!enrollment.url?.trim()) {
      return null;
    }
    try {
      return new URL(enrollment.url).host || enrollment.url;
    } catch {
      return enrollment.url;
    }
  })();

  return (
    <>
      <div className="@container/content px-4 pt-6 pb-4">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-4 @min-[700px]/content:grid-cols-[minmax(0,1fr)_24rem]">
          <EventHeroImage
            className="@min-[700px]/content:col-start-2 @min-[700px]/content:row-start-1"
            src={data.data.image_id ? getEventImageUrl(id) : null}
          />

          <div className="border-base-300 rounded-2xl border p-4 @min-[700px]/content:col-start-1 @min-[700px]/content:row-span-2 @min-[700px]/content:row-start-1 @min-[700px]/content:p-6">
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
              <h1 className="min-w-0 flex-1 text-xl font-medium wrap-anywhere @min-[700px]/content:text-2xl">
                {title}
              </h1>
            </div>

            <ul className="mb-6 flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="icon-[material-symbols--schedule-outline] shrink-0 text-xl" />
                <span>{formatEventDateRange(data.data.starts_at, endsAt)}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="icon-[material-symbols--person-outline] shrink-0 text-xl" />
                <div className="min-w-0">
                  <PublicHostsList hosts={data.data.hosts} />
                </div>
              </li>
              <li className="flex items-center gap-2">
                <span className="icon-[material-symbols--location-on-outline] shrink-0 text-xl" />
                <LocationLink location={data.data.location} />
              </li>
            </ul>

            <DescriptionViewer
              content={parseDescriptionContent(localeContent?.description)}
              className="text-base-content/80"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4 @min-[700px]/content:col-start-2 @min-[700px]/content:row-start-2">
            <div className="border-base-300 rounded-2xl border p-4">
              <div className="mb-3 text-sm">
                {isExternal ? (
                  enrollment.url && enrollmentHost ? (
                    <p className="flex flex-wrap items-center gap-1">
                      <span>Enrollment on</span>
                      <a
                        href={enrollment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        {enrollmentHost}
                        <span className="icon-[material-symbols--open-in-new] text-base" />
                      </a>
                    </p>
                  ) : (
                    <p>External enrollment</p>
                  )
                ) : (
                  <p>
                    {data.enrolled_count}
                    {capacity !== null && capacity !== undefined
                      ? ` / ${capacity}`
                      : ""}{" "}
                    {capacity !== null && capacity !== undefined
                      ? "students"
                      : data.enrolled_count === 1
                        ? "student"
                        : "students"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {enrolledEmails && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEnrolledOpen(true)}
                  >
                    Participants
                  </button>
                )}
                {!me ? (
                  <SignInButton />
                ) : isExternal ? (
                  data.enrolled ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={actionPending}
                      onClick={() => unenroll({ params: { path: { id } } })}
                    >
                      {isUnenrolling && (
                        <span className="loading loading-spinner loading-sm" />
                      )}
                      Remove from calendar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={actionPending}
                      onClick={() => enroll({ params: { path: { id } } })}
                    >
                      {isEnrolling && (
                        <span className="loading loading-spinner loading-sm" />
                      )}
                      Add to calendar
                    </button>
                  )
                ) : data.enrolled ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={actionPending}
                    onClick={() => unenroll({ params: { path: { id } } })}
                  >
                    {isUnenrolling && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    Unenroll
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actionPending || atCapacity}
                    onClick={() => enroll({ params: { path: { id } } })}
                  >
                    {isEnrolling && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    {atCapacity ? "Full" : "Enroll"}
                  </button>
                )}
              </div>
            </div>

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

            {(data.can_edit_draft || isModerator) && (
              <div className="border-base-300 flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4">
                <p className="text-sm font-medium">Manage</p>
                <div className="flex flex-wrap justify-end gap-2">
                  {data.can_edit_draft && (
                    <Link
                      to="/events/drafts/$id"
                      params={{ id }}
                      className="btn btn-sm btn-ghost border"
                    >
                      Edit draft
                    </Link>
                  )}
                  {isModerator && (
                    <button
                      type="button"
                      className="btn btn-error btn-sm"
                      disabled={isUnpublishing}
                      onClick={handleUnpublish}
                    >
                      {isUnpublishing && (
                        <span className="loading loading-spinner loading-sm" />
                      )}
                      Unpublish
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {enrolledEmails && (
        <EnrolledListModal
          open={enrolledOpen}
          onOpenChange={setEnrolledOpen}
          enrolledEmails={enrolledEmails}
        />
      )}
    </>
  );
}
