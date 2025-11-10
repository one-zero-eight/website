import { $workshops } from "@/api/workshops";
import { SchemaWorkshop } from "@/api/workshops/types";
import clsx from "clsx";
import { useState, useMemo } from "react";

export interface ParticipantsProps {
  event: SchemaWorkshop;
  hide: boolean;
  className?: string;
}

export default function Participants({
  event,
  hide,
  className,
}: ParticipantsProps) {
  const [showAll, setShowAll] = useState(false);
  const displayLimit = 5;

  const { data: participants = [], isPending: loading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}/checkins",
    {
      params: { path: { workshop_id: event?.id } },
    },
  );

  // Memoized derived values
  const visibleParticipants = useMemo(
    () => (showAll ? participants : participants.slice(0, displayLimit)),
    [participants, showAll],
  );

  const hiddenCount = Math.max(participants.length - displayLimit, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Host card */}
      {event.host && (
        <div className="card card-border">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2 text-xl">
              <span className="icon-[sidekickicons--crown-20-solid]" />
              <span>Event Host</span>
            </h3>
            <p className="prose dark:prose-invert">{event.host}</p>
          </div>
        </div>
      )}

      {/* Participants card */}
      <div
        className={clsx(
          "card card-border",
          hide ? "hidden" : "flex",
          className,
        )}
      >
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2 text-xl">
            <span className="icon-[material-symbols--group-outline]" />
            <span>Participants ({participants.length})</span>
          </h3>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : participants.length === 0 ? (
            <p className="text-base-content/60 text-base">
              No one has checked in yet!
            </p>
          ) : (
            <>
              {/* Participants list */}
              <div className="mt-2 space-y-2">
                {visibleParticipants.map((p) => (
                  <div className="flex items-center gap-2">
                    <span className="icon-[tabler--point-filled]" />
                    <div
                      key={p.innohassle_id}
                      className="text-base-content/80 flex flex-col md:grid md:@max-[220px]/content:grid-cols-2 md:@min-[100px]/content:grid-cols-1"
                    >
                      <div className="min-w-0">
                        {p.name ? (
                          <div className="truncate" title={p.name}>
                            {p.name}
                          </div>
                        ) : (
                          p.email && (
                            <div className="truncate" title={p.email}>
                              {p.email.split("@")[0]}
                            </div>
                          )
                        )}
                      </div>

                      {p.telegram_username && (
                        <div className="">
                          <a
                            href={`https://t.me/${p.telegram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                            title={`@${p.telegram_username}`}
                          >
                            @{p.telegram_username}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle buttons */}
              {hiddenCount > 0 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
                >
                  and {hiddenCount} more participants
                </button>
              )}

              {showAll && participants.length > displayLimit && (
                <button
                  onClick={() => setShowAll(false)}
                  className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
                >
                  Hide
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
