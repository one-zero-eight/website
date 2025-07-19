/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { workshopsFetch } from "@/api/workshops";
import { useToast } from "../../toast";

type Workshop = {
  id: string;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
  remainPlaces?: number;
  isActive?: boolean;
  isRegistrable?: boolean;
};

type Participant = {
  id: string;
  innohassle_id: string;
  role: "admin" | "user";
  email: string;
  t_alias?: string;
};

interface WorkshopProps {
  workshop: Workshop | null;
  refreshTrigger?: number;
  remove?: (workshop: Workshop) => Promise<void>;
  edit?: (workshop: Workshop) => void;
  currentUserRole?: "user" | "admin";
  refreshParticipants?: () => void;
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

const processTextNode = (text: string): (string | JSX.Element)[] => {
  const result: (string | JSX.Element)[] = [];
  let buffer = "";
  
  for (let i = 0; i < text.length; i++) {
    const urlMatch = text.slice(i).match(/^https?:\/\/[^\s<>{}|\\^[\]`"()]+/i);
    if (urlMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const url = urlMatch[0];
      result.push(
        <a
          className="break-all text-brand-violet hover:scale-110 hover:text-brand-violet/80"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={`url-${i}`}
        >
          {url}
        </a>,
      );
      i += url.length - 1;
      continue;
    }
    const tgMatch = text.slice(i).match(/^@[a-zA-Z0-9_]{5,32}\b/);
    if (tgMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const username = tgMatch[0];
      result.push(
        <a
          className="break-all text-brand-violet hover:scale-110 hover:text-brand-violet/80"
          href={`https://t.me/${username.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          key={`tg-${i}`}
        >
          {username}
        </a>,
      );
      i += username.length - 1;
      continue;
    }
    buffer += text[i];
  }
  if (buffer) {
    result.push(buffer);
  }
  return result;
};

const MarkdownWithCustomLinks: React.FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Переопределяем рендеринг текстовых узлов для обработки URL и Telegram алиасов
        text: ({ children }) => {
          if (typeof children === 'string') {
            return <>{processTextNode(children)}</>;
          }
          return <>{children}</>;
        },
        // Стилизация ссылок в markdown
        a: ({ href, children }) => (
          <a
            className="break-all text-brand-violet hover:scale-110 hover:text-brand-violet/80"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // Стилизация жирного текста
        strong: ({ children }) => (
          <strong className="font-bold">{children}</strong>
        ),
        // Стилизация курсива
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // Стилизация параграфов
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

const Description: React.FC<WorkshopProps> = ({
  workshop,
  refreshTrigger,
  remove,
  edit,
  currentUserRole,
  refreshParticipants,
}) => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [workshopChosen, setWorkshopChosen] = useState(false);
  const [signedPeople, setSignedPeople] = useState<number>(0);

  const displayLimit = 5; // Количество участников для отображения по умолчанию
  const visibleParticipants = showAllParticipants
    ? participants
    : participants.slice(0, displayLimit);
  const hiddenCount = participants.length - displayLimit;

  // Функция для проверки активности воркшопа
  const isWorkshopActive = () => {
    return workshop?.isActive !== false && workshop?.isRegistrable !== false;
  };

  // Функция для получения текста статуса неактивности
  const getInactiveStatusText = () => {
    if (workshop?.isRegistrable === false && workshop?.isActive !== false) {
      return `Inactive due ${formatDate(workshop.date)} ${formatTime(workshop.startTime)}`;
    } else {
      return "Inactive";
    }
  };

  // Функция для форматирования даты начала (как в WorkshopItem)
  const formatStartDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const previousDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const day = previousDay.getDate().toString().padStart(2, "0");
    const month = (previousDay.getMonth() + 1).toString().padStart(2, "0");
    const year = previousDay.getFullYear();
    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    if (!workshop?.id) return;

    const fetchParticipants = async () => {
      setLoadingParticipants(true);
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
      setLoadingParticipants(false);
    };

    fetchParticipants();
  }, [workshop?.id, refreshTrigger]);

  useEffect(() => {
    if (!workshop?.id) return;

    (async () => {
      const { data, error } = await workshopsFetch.GET(`/users/my_checkins`);
      if (!error && Array.isArray(data)) {
        const isCheckedIn = data.some((w) => w.id === workshop.id);
        setWorkshopChosen(isCheckedIn);
      }

      // Используем remainPlaces из пропсов воркшопа если есть, иначе используем количество участников
      if (workshop.remainPlaces !== undefined && workshop.maxPlaces) {
        const signedCount = workshop.maxPlaces - workshop.remainPlaces;
        setSignedPeople(Math.max(0, signedCount));
      } else {
        setSignedPeople(participants.length);
      }
    })();
  }, [
    workshop?.id,
    workshop?.remainPlaces,
    workshop?.maxPlaces,
    participants.length,
  ]);

  const handleCheckIn = async () => {
    if (!workshop?.id) return;

    if (workshop.maxPlaces > 0 && signedPeople >= workshop.maxPlaces) {
      return;
    }

    const { error } = await workshopsFetch.POST(
      `/workshops/{workshop_id}/checkin`,
      {
        params: {
          path: { workshop_id: workshop.id.toString() },
        },
      },
    );

    if (!error) {
      setWorkshopChosen(true);
      setSignedPeople((count) => count + 1);
      refreshParticipants?.();
      showSuccess(
        "Check-in Successful",
        "You have successfully checked-in for this workshop.",
      );
    } else {
      showError("Check-in Failed", "Failed to check in. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    if (!workshop?.id) return;

    const { error } = await workshopsFetch.POST(
      `/workshops/{workshop_id}/checkout`,
      {
        params: {
          path: { workshop_id: workshop.id.toString() },
        },
      },
    );

    if (!error) {
      setWorkshopChosen(false);
      setSignedPeople((count) => Math.max(0, count - 1));
      refreshParticipants?.();
      showSuccess(
        "Check-out Successful",
        "You have successfully checked-out from this workshop.",
      );
    } else {
      showError("Check-out Failed", "Failed to check out. Please try again.");
    }
  };

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
      <div className="mb-1.5 max-h-24 overflow-y-auto break-words text-lg leading-6 [overflow-wrap:anywhere]">
        <MarkdownWithCustomLinks>{workshop.body}</MarkdownWithCustomLinks>
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

      {/* Кнопки управления и записи */}
      <div className="mt-4 flex flex-wrap gap-3 border-b border-contrast/20 pb-4">
        {/* Кнопки управления для администраторов */}
        {currentUserRole === "admin" && (
          <>
            <button
              onClick={() => edit?.(workshop)}
              className="flex items-center justify-center gap-2 rounded-xl border border-brand-violet/30 bg-brand-violet/10 px-4 py-2.5 text-brand-violet backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-brand-violet/50 hover:bg-brand-violet/20 hover:text-brand-violet/90"
              title="Edit workshop"
            >
              <span className="icon-[mynaui--pencil] text-lg" />
              <span className="text-sm font-medium">Edit</span>
            </button>
            <button
              onClick={async () => await remove?.(workshop)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-4 py-2.5 text-[#ff6b6b] backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-[#ff5252]/50 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252]"
              title="Delete workshop"
            >
              <span className="icon-[material-symbols--delete-outline-rounded] text-lg" />
              <span className="text-sm font-medium">Delete</span>
            </button>
          </>
        )}

        {/* Кнопки записи для активных воркшопов или плашка неактивности */}
        {isWorkshopActive() ? (
          workshopChosen ? (
            <button
              onClick={handleCheckOut}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-4 py-2.5 text-[#ff6b6b] backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-[#ff5252]/50 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252]"
              title="Check out"
            >
              <span className="icon-[material-symbols--remove] text-lg" />
              <span className="text-sm font-medium">Check out</span>
            </button>
          ) : (
            <button
              disabled={
                workshop.maxPlaces > 0 && signedPeople >= workshop.maxPlaces
              }
              onClick={handleCheckIn}
              className="flex items-center justify-center gap-2 rounded-xl border border-green-700/30 bg-green-600/10 px-4 py-2.5 text-green-700 backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-green-600/50 hover:bg-green-600/20 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#bcdfbc]/30 dark:bg-[#bcdfbc]/10 dark:text-[#bcdfbc] dark:hover:border-[#aad6aa]/50 dark:hover:bg-[rgba(167,202,167,0.2)] dark:hover:text-[#aad6aa]"
              title="Check in"
            >
              <span className="icon-[material-symbols--add-rounded] text-lg" />
              <span className="text-sm font-medium">Check in</span>
            </button>
          )
        ) : (
          /* Плашка неактивности вместо кнопки записи */
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.15)] px-4 py-2.5 text-[#ff6b6b] backdrop-blur-[8px]">
            <span className="icon-[material-symbols--block] text-lg" />
            <span className="text-sm font-medium">
              {getInactiveStatusText()}
            </span>
          </div>
        )}
      </div>

      {/* Секция с участниками */}
      <div className="mt-4">
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
                <span className="text-m font-mono">
                  {participant.email.split("@")[0]}
                  {currentUserRole === "admin" &&
                    (participant.t_alias === "None" ? (
                      " (no tg alias)"
                    ) : (
                      <>
                        {" ("}
                        <a
                          href={`https://t.me/${participant.t_alias}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-violet hover:scale-110 hover:text-brand-violet/80"
                        >
                          @{participant.t_alias}
                        </a>
                        {")"}
                      </>
                    ))}
                </span>
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
