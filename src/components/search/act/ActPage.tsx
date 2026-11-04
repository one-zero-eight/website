import { $search } from "@/api/search";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import SearchField from "@/components/search/SearchField.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import AnimatedDots from "../AnimatedDots";
import { ActResult } from "./ActResult";

export function ActPage({ actQuery }: { actQuery: string }) {
  useLingui();
  const navigate = useNavigate();

  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const didInit = useRef(false);

  const {
    data: result,
    isLoading,
    isFetching,
    error,
    refetch,
  } = $search.useQuery(
    "post",
    "/act/",
    {
      body: { query: submittedQuery ?? "" },
    },
    {
      enabled: submittedQuery !== null && submittedQuery.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    if (didInit.current) {
      setSubmittedQuery(actQuery);
    } else {
      didInit.current = true;
    }
  }, [actQuery]);

  const runSearch = (query: string) => {
    navigate({ to: "/search/act", search: { q: query } });
    if (query === submittedQuery) {
      refetch();
    } else {
      setSubmittedQuery(query);
    }
  };

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField
        pageType="act"
        runSearch={runSearch}
        currentQuery={actQuery}
      />
      <span>
        <Trans>AI Assistant:</Trans>
      </span>
      {isLoading || isFetching ? (
        <div className="border-base-300 bg-base-200 text-base-content rounded-field flex self-start border! px-4 py-2">
          <span>
            <Trans>- Executing</Trans>
          </span>
          <AnimatedDots></AnimatedDots>
        </div>
      ) : result ? (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0">
            <ActResult response={result} />
          </div>
        </div>
      ) : error ? (
        <div className="border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-2 self-start border! px-4 py-2">
          <span>
            <Trans>- Sorry, I can't help you with this question.</Trans>
          </span>
          <span className="text-base-content/60 text-sm">
            {formatApiErrorMessage(error)}
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-row gap-1">
            <div>-</div>
            <div className="flex flex-col gap-1">
              <span>
                <Trans>Hi! I'm AI Assistant.</Trans>
              </span>
              <span>
                <Trans>I can help you to book the music room.</Trans>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
