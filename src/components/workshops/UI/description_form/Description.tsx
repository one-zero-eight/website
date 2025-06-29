/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { workshopsFetch } from "@/api/workshops";

type Workshop = {
  id: string;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  remainPlaces?: number;
};

type Participant = {
  id: string;
  innohassle_id: string;
  role: "admin" | "user";
  email: string;
};

interface WorkshopProps {
  workshop: Workshop | null;
  refreshTrigger?: number;
}
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU");
};
const formatTime = (timeString: string) => {
  if (!timeString) return "";
  return timeString;
};
const urlRegex = /https?:\/\/(.\.?)+\..+/;
const telegramUsernameRegex = /(^|\s)@[a-zA-Z0-9_]{5,32}\b/;

const ReplaceURL = (str: string) => {
  const texts = str.split(" ").reduce(
    (acc: { array: string[]; urls: string[]; text: string }, text) => {
      if (urlRegex.test(text) || telegramUsernameRegex.test(text)) {
        acc.array.push(acc.text);
        acc.urls.push(text);
        acc.text = " ";

        return acc;
      }

      acc.text += `${text} `;

      return acc;
    },
    { array: [], urls: [], text: "" },
  );

  if (texts.text) texts.array.push(texts.text);
  const links = texts.urls.map((url) => {
    if (telegramUsernameRegex.test(url)) {
      return (
        <a
          className="text-brand-violet transition-all duration-200 hover:scale-110 hover:text-brand-violet/80"
          href={"https://t.me/" + url.slice(1)}
          target="_blank"
          rel="noopener noreferrer"
          key={url}
        >
          {url}
        </a>
      );
    } else {
      return (
        <a
          className="text-brand-violet transition-all duration-200 hover:scale-110 hover:text-brand-violet/80"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={url}
        >
          {url}
        </a>
      );
    }
  });

  const merged = [];

  for (let i = 0; i < texts.array.length; i += 1) {
    merged.push(texts.array[i]);
    if (links[i]) merged.push(links[i]);
  }

  return merged;
};
const Description: React.FC<WorkshopProps> = ({ workshop, refreshTrigger }) => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const displayLimit = 5; // Количество участников для отображения по умолчанию
  const visibleParticipants = showAllParticipants
    ? participants
    : participants.slice(0, displayLimit);
  const hiddenCount = participants.length - displayLimit;

  useEffect(() => {
    if (!workshop?.id) return;

    const fetchParticipants = async () => {
      setLoadingParticipants(true);
      try {
        const { data, error } = await workshopsFetch.GET(
          `/workshops/{workshop_id}/checkins`,
          {
            params: {
              path: { workshop_id: workshop.id },
            },
          },
        );

        if (!error && data) {
          setParticipants(data);
        }
      } catch (error) {
        console.error("Failed to fetch participants:", error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [workshop?.id, refreshTrigger]);

  const handleRoomClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (workshop?.room) {
      navigate({
        to: "/maps",
        search: { q: workshop.room },
      });
    }
  };

  if (!workshop) return <div>No description</div>;
  return (
    <div className="flex flex-col p-5 text-contrast">
      <div className="mb-1.5 max-h-24 overflow-y-auto text-lg leading-6">
        {ReplaceURL(workshop.body)}
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--location-on-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          <span
            onClick={handleRoomClick}
            className="cursor-pointer text-brand-violet underline hover:text-brand-violet/80"
            title="Click to view on map"
          >
            {workshop.room}
          </span>
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--today-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          {formatDate(workshop.date)}
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--schedule-outline] text-2xl" />
        </div>
        {formatTime(workshop.startTime) + "-" + formatTime(workshop.endTime)}
      </div>

      {/* Секция с участниками */}
      <div className="mt-4 border-t border-contrast/20 pt-4">
        <div className="mb-3 flex flex-row items-center gap-2 text-xl text-contrast/75">
          <div className="flex h-fit w-6">
            <span className="icon-[material-symbols--group-outline] text-2xl" />
          </div>
          <p className="font-medium">Participants ({participants.length})</p>
        </div>

        {loadingParticipants ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-violet border-t-transparent"></div>
          </div>
        ) : participants.length > 0 ? (
          <div className="space-y-2">
            {visibleParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 text-base text-contrast/80"
              >
                <span className="text-m text-brand-violet">•</span>
                <span className="text-m font-mono">{participant.email}</span>
              </div>
            ))}

            {hiddenCount > 0 && !showAllParticipants && (
              <button
                onClick={() => setShowAllParticipants(true)}
                className="mt-2 text-sm text-brand-violet transition-colors duration-200 hover:text-brand-violet/80"
              >
                and {hiddenCount} more participants
              </button>
            )}

            {showAllParticipants && participants.length > displayLimit && (
              <button
                onClick={() => setShowAllParticipants(false)}
                className="mt-2 text-sm text-brand-violet transition-colors duration-200 hover:text-brand-violet/80"
              >
                Hide
              </button>
            )}
          </div>
        ) : (
          <p className="text-base text-contrast/60">
            No one has checked in yet!
          </p>
        )}
      </div>
    </div>
  );
};

export default Description;
