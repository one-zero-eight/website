import { $search, type searchTypes } from "@/api/search";
import { RequireAuth } from "@/components/common/AuthWall";
import { Modal } from "@/components/common/Modal";
import { SourceRequests } from "@/components/search/SourceRequests";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

function modeLabel(
  mode: searchTypes.SourceTopicViewMode | searchTypes.SourceViewDefault_mode,
) {
  if (mode === "store") return <Trans>Saving messages</Trans>;
  if (mode === "search") return <Trans>Searching on request</Trans>;
  return <Trans>Disabled</Trans>;
}

export function AskSources() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(true)}
      >
        <span className="icon-[material-symbols--source] text-lg" />
        <Trans>Sources</Trans>
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={<Trans>Sources</Trans>}
        containerClassName="max-h-[85dvh] overflow-y-auto"
      >
        {open && (
          <RequireAuth>
            <AskSourcesContent />
          </RequireAuth>
        )}
      </Modal>
    </>
  );
}

function AskSourcesContent() {
  const query = $search.useQuery("get", "/sources", undefined, {
    enabled: true,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const data = query.data;
  const isLoading = query.isPending || query.isFetching;

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <p className="text-base-content/70 text-sm">
            <Trans>Loading sources</Trans>
          </p>
          <span className="skeleton h-5 w-1/2" />
          <span className="skeleton h-16 w-full" />
        </div>
      ) : query.isError ? (
        <div className="border-error/30 bg-error/10 rounded-box flex flex-col gap-2 border p-3">
          <p>
            <Trans>Could not load sources.</Trans>
          </p>
          <button
            type="button"
            className="btn btn-sm self-start"
            onClick={() => void query.refetch()}
          >
            <Trans>Retry</Trans>
          </button>
        </div>
      ) : data ? (
        <>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">
              <Trans>Verified study groups</Trans>
            </h3>
            {data.verified_groups.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {data.verified_groups.map((group) => (
                  <li key={group} className="badge badge-outline">
                    {group}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base-content/70 text-sm">
                <Trans>
                  Study group verification is unavailable. Common sources are
                  still available.
                </Trans>
              </p>
            )}
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-semibold">
              <Trans>Available sources</Trans>
            </h3>
            {data.sources.length ? (
              data.sources.map((source) => (
                <article
                  key={source.chat_id}
                  className="border-base-300 rounded-box flex flex-col gap-2 border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-medium">{source.title}</h4>
                    <span className="badge badge-outline">
                      {source.group_code === "all" ? (
                        <Trans>Common source</Trans>
                      ) : (
                        source.group_code
                      )}
                    </span>
                  </div>
                  <p className="text-base-content/70 text-sm">
                    {source.forum ? (
                      <Trans>Other and new topics</Trans>
                    ) : (
                      <Trans>Whole chat</Trans>
                    )}
                    : {modeLabel(source.default_mode)}
                  </p>
                  {source.forum && source.topics.length > 0 && (
                    <ul className="border-base-300 flex flex-col gap-1 border-t pt-2">
                      {source.topics.map((topic) => (
                        <li
                          key={topic.topic_id}
                          className="flex flex-wrap justify-between gap-2 text-sm"
                        >
                          <span>{topic.title}</span>
                          <span className="text-base-content/70">
                            {modeLabel(topic.mode)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {source.has_stored_messages && (
                    <p className="text-base-content/70 text-sm">
                      <Trans>
                        Saved message history remains searchable even when
                        collection is disabled.
                      </Trans>
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="text-base-content/70 text-sm">
                <Trans>No available sources.</Trans>
              </p>
            )}
          </section>
          <p className="text-base-content/60 text-sm">
            <Trans>
              These are configured capabilities, not a guarantee that a source
              is currently online.
            </Trans>
          </p>
        </>
      ) : null}
      <div className="border-base-300 border-t pt-2">
        <SourceRequests />
      </div>
    </div>
  );
}
