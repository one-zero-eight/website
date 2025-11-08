import { $workshops } from "@/api/workshops";
import { SchemaWorkshop } from "@/api/workshops/types";
import clsx from "clsx";
import { useState } from "react";

export interface ParticipantsProps {
  event: SchemaWorkshop;
  className?: string;
}

export default function Participants({ event, className }: ParticipantsProps) {
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  const { data: participants, isPending: participantsIsPending } =
    $workshops.useQuery("get", "/workshops/{workshop_id}/checkins", {
      params: { path: { workshop_id: event?.id } },
    });

  const displayLimit = 5; // Количество участников для отображения по умолчанию

  const visibleParticipants = participants
    ? showAllParticipants
      ? participants
      : participants.slice(0, displayLimit)
    : [];

  const hiddenCount = (participants?.length ?? 0) - displayLimit;

  return (
    <div className={clsx("card card-border", className)}>
      {/* Секция с участниками */}
      <div className="card-body">
        <div className="text-base-content/75 mb-3 flex flex-row items-center gap-2 text-xl">
          <div className="flex h-fit w-6">
            <span className="icon-[material-symbols--group-outline] text-2xl" />
          </div>
          <p className="font-medium">Participants ({participants?.length})</p>
        </div>

        {participantsIsPending ? (
          <div className="flex items-center justify-center py-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
          </div>
        ) : participants && participants.length > 0 ? (
          <table>
            {visibleParticipants.map((participant) => (
              <tr
                key={participant.innohassle_id}
                className="text-base-content/80 text-base whitespace-pre-wrap"
              >
                {/* <td className="font-mono">{participant.email.split("@")[0]}</td> */}
                {participant.name && <td>{participant.name}</td>}
                {participant.telegram_username && (
                  <td>
                    <a
                      href={`https://t.me/${participant.telegram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      @{participant.telegram_username}
                    </a>
                  </td>
                )}
              </tr>
            ))}

            {hiddenCount > 0 && !showAllParticipants && (
              <button
                onClick={() => setShowAllParticipants(true)}
                className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
              >
                and {hiddenCount} more participants
              </button>
            )}

            {showAllParticipants && participants.length > displayLimit && (
              <button
                onClick={() => setShowAllParticipants(false)}
                className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
              >
                Hide
              </button>
            )}
          </table>
        ) : (
          <p className="text-base-content/60 text-base">
            No one has checked in yet!
          </p>
        )}
      </div>
    </div>
  );
}
