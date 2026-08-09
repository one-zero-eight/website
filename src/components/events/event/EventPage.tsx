import { useMe } from "@/api/accounts/user.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { EventHeroImage } from "../shared/EventHeroImage";
import { EventInfoCard } from "../shared/EventInfoCard";
import { EventPageLayout } from "../shared/EventPageLayout";
import { LocaleContentSection } from "../shared/LocaleContentSection";
import { getEventImageUrl } from "../utils/links";
// import { EnrolledListModal } from "./EnrolledListModal";

export function EventPage({ id }: { id: string }) {
  const { me } = useMe();
  const { showError } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  // const [enrolledOpen, setEnrolledOpen] = useState(false);

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

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
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
  // const enrolledUsers = data.enrolled_users ?? null;
  const actionPending = isEnrolling || isUnenrolling;

  return (
    <>
      <EventPageLayout
        hero={
          <EventHeroImage
            src={data.data.image_id ? getEventImageUrl(id) : null}
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
              host={data.data.host}
              startsAt={data.data.starts_at}
              location={data.data.location}
            />
            <div className="border-base-300 rounded-2xl border p-4">
              <p className="mb-3 text-sm">
                {data.enrolled_count} students enrolled
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {/* {enrolledUsers && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEnrolledOpen(true)}
                  >
                    Enrolled list
                  </button>
                )} */}
                {!me ? (
                  <SignInButton />
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
                    disabled={actionPending}
                    onClick={() => enroll({ params: { path: { id } } })}
                  >
                    {isEnrolling && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    Enroll
                  </button>
                )}
              </div>
            </div>
          </>
        }
      />
      {/* {enrolledUsers && (
        <EnrolledListModal
          open={enrolledOpen}
          onOpenChange={setEnrolledOpen}
          enrolledUsers={enrolledUsers}
        />
      )} */}
    </>
  );
}
