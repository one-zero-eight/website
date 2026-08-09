import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import Tooltip from "@/components/common/Tooltip.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventHeroImage } from "../shared/EventHeroImage";
import { EventInfoCard } from "../shared/EventInfoCard";
import { EventPageLayout } from "../shared/EventPageLayout";
import { LocaleContentSection } from "../shared/LocaleContentSection";
import { getSubmissionImageUrl } from "../utils/links";

export function SubmissionPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
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
        showSuccess("Approved", "Event published.");
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
        showSuccess("Declined", "Submission declined.");
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
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
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

  const localeContent = selectedLocale
    ? data.submission.data.locales[selectedLocale]
    : undefined;
  const feedbackTrimmed = feedback.trim();
  const declineDisabled = !feedbackTrimmed || isDeclining || isApproving;

  return (
    <EventPageLayout
      hero={
        <EventHeroImage
          src={data.submission.data.image_id ? getSubmissionImageUrl(id) : null}
        />
      }
      main={
        <LocaleContentSection
          locales={locales}
          selectedLocale={selectedLocale}
          onSelectLocale={setSelectedLocale}
          name={localeContent?.name}
          description={localeContent?.description}
        />
      }
      side={
        <>
          <EventInfoCard
            storedHost={data.submission.data.host}
            clubs={clubs}
            startsAt={data.submission.data.starts_at}
            location={data.submission.data.location}
          />
          <div className="border-base-300 rounded-2xl border p-4">
            <p className="mb-2 text-sm font-medium">
              Leave your feedback and judge
            </p>
            <textarea
              className="textarea textarea-bordered mb-3 min-h-28 w-full"
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
                  onClick={() =>
                    decline({
                      params: { path: { id } },
                      body: { feedback: feedbackTrimmed },
                    })
                  }
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
                onClick={() =>
                  approve({
                    params: { path: { id } },
                    body: { feedback: feedbackTrimmed },
                  })
                }
              >
                {isApproving && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Approve
              </button>
            </div>
          </div>
        </>
      }
    />
  );
}
