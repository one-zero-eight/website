import React, { useEffect, useState } from "react";
import { workshopsFetch } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";

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

type WorkshopItemProps = {
  workshop: Workshop;
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
  currentUserRole: "user" | "admin";
};

const WorkshopItem: React.FC<WorkshopItemProps> = ({
  workshop,
  remove,
  edit,
  openDescription,
  currentUserRole,
}) => {
  const navigate = useNavigate();
  const [workshopChosen, setWorkshopChosen] = useState(false);
  {
    /* Стэйт для управления количеством записанных людей */
  }
  const [signedPeople, setSignedPeople] = useState<number>(0);
  // Функция для проверки активности воркшопа
  const isWorkshopActive = () => {
    return workshop.isActive !== false && workshop.isRegistrable !== false;
  };
  // Функция для получения текста статуса неактивности
  const getInactiveStatusText = () => {
    if (workshop.isRegistrable === false && workshop.isActive !== false) {
      // Только isRegistrable false показываем дату и время начала
      return `Inactive due ${formatStartDate(workshop.date)} ${formatTime(workshop.startTime)}`;
    } else {
      // isActive false или оба false просто Inactive
      return "Inactive";
    }
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был не по кнопкам и не по ссылке на комнату
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest('[title="Click to view on map"]')) {
      openDescription(workshop);
    }
  };
  const formatStartDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Вычитаем один день
    const previousDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const day = previousDay.getDate().toString().padStart(2, '0');
    const month = (previousDay.getMonth() + 1).toString().padStart(2, '0');
    const year = previousDay.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString;
  };  
  const handleRoomClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (workshop.room) {
      navigate({
        to: "/maps",
        search: { q: workshop.room },
      });
    }
  };
  useEffect(() => {
    (async () => {
      const { data, error } = await workshopsFetch.GET(`/users/my_checkins`);
      if (!error && Array.isArray(data)) {
        const isCheckedIn = data.some((w) => w.id === workshop.id);
        setWorkshopChosen(isCheckedIn);
      }

      // Используем remainPlaces из пропсов воркшопа если есть, иначе делаем API запрос
      if (workshop.remainPlaces !== undefined) {
        // Вычисляем количество записанных людей из remainPlaces
        const signedCount = workshop.maxPlaces - workshop.remainPlaces;
        setSignedPeople(Math.max(0, signedCount)); // Не допускаем отрицательных значений
      } else {
        // Fallback к API запросу если remainPlaces недоступно
        const { data: checkinsData, error: checkinsError } =
          await workshopsFetch.GET(`/api/workshops/{workshop_id}/checkins`, {
            params: {
              path: { workshop_id: workshop.id.toString() },
            },
          });

        if (!checkinsError && checkinsData && Array.isArray(checkinsData)) {
          setSignedPeople(checkinsData.length);
        }
      }
    })();
  }, [workshop.id, workshop.remainPlaces, workshop.maxPlaces]);

  const handleCheckIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (workshop.maxPlaces > 0 && signedPeople >= workshop.maxPlaces) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await workshopsFetch.POST(
        `/api/workshops/{workshop_id}/checkin`,
        {
          params: {
            path: { workshop_id: workshop.id.toString() },
          },
        },
      );

      if (!error) {
        setWorkshopChosen(true);
        setSignedPeople((count) => count + 1);
      } else {
        alert("Failed to check in");
      }
    } catch (error) {
      console.error("Check-in failed", error);
      alert("Error occur when trying to check in.");
    }
  };

  const handleCheckOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await workshopsFetch.POST(
        `/api/workshops/{workshop_id}/checkout`,
        {
          params: {
            path: { workshop_id: workshop.id.toString() },
          },
        },
      );

      if (!error) {
        setWorkshopChosen(false);
        setSignedPeople((count) => Math.max(0, count - 1));
      } else {
        alert("Failed to check out");
      }
    } catch (error) {
      console.error("Check-out failed", error);
      alert("Error occur when trying to check out");
    }
  };
  return (    
  <div
      className={`relative w-full max-w-[280px] rounded-2xl bg-[#1e1e1e] border p-4 pb-[55px] shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] 
        ${isWorkshopActive() ? "hover:-translate-y-1 hover:transform hover:shadow-[0_8px_24px_rgba(120,0,255,0.3)]" : "opacity-60 grayscale-[50%] border-brand-violet/30"} 
        ${workshopChosen ? "bg-[#1e2e1e] bg-gradient-to-br from-[#1a2b1a] to-[#1e2e1e] shadow-[0_4px_16px_rgba(76,175,80,0.1)] hover:shadow-[0_8px_24px_rgba(76,175,80,0.4)] border-green-500/60" : "border-brand-violet/40"} `}
      onClick={handleContentClick}
    >
      <div className="flex items-center justify-between">
        {workshop.startTime && workshop.endTime && (
          <p className="flex items-center justify-start text-[15px] font-medium text-brand-violet">
            {formatTime(workshop.startTime)} - {formatTime(workshop.endTime)}
          </p>
        )}
        <p className="flex items-center justify-end text-[15px] font-medium text-brand-violet">
          {workshop.maxPlaces > 0
            ? workshop.maxPlaces === 500
              ? signedPeople + "/"
              : signedPeople + "/" + workshop.maxPlaces
            : "No limit on number of people"}
          {workshop.maxPlaces === 500 && (
            <span className="icon-[mdi--infinity] mt-0.5"></span>
          )}
        </p>
      </div>
      <h3 className="my-1.5 mb-2 text-lg font-semibold leading-[1.3] text-white">
        {" "}
        {workshop.title}
      </h3>
      {!isWorkshopActive() && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 transform rounded-xl border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.15)] px-4 py-2 text-center text-sm font-semibold text-[#ff6b6b] backdrop-blur-[8px]">
          {getInactiveStatusText()}
        </p>
      )}      {workshop.room && (
        <div className="my-2">
          <p className="m-0 text-base text-white/80">
            <strong>Room:</strong>{" "}
            <span
              onClick={handleRoomClick}
              className="relative z-[5] cursor-pointer text-brand-violet underline hover:text-brand-violet/80"
              title="Click to view on map"
            >
              {workshop.room}
            </span>
          </p>
        </div>
      )}

      {/* Кликабельная область */}
      <div className="absolute bottom-0 left-0 right-0 top-0 z-0 cursor-pointer"></div>

      {/* Показываем кнопки управления только для администраторов */}
      {currentUserRole === "admin" && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(workshop);
            }}
            className="absolute bottom-3 right-3 flex cursor-pointer items-center justify-center rounded-xl border border-[#ff6b6b]/20 bg-black/40 p-2.5 text-[#ff6b6b] backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-[#ff5252]/40 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252]"
            title="Delete workshop"
          >
            <span className="icon-[material-symbols--delete-outline-rounded] text-xl" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              edit(workshop);
            }}
            className="absolute bottom-3 left-3 flex cursor-pointer items-center justify-center rounded-xl border border-brand-violet/20 bg-black/40 p-2.5 text-brand-violet backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-brand-violet/40 hover:bg-brand-violet/20 hover:text-brand-violet/80"
            title="Edit workshop"
          >
            <span className="icon-[mynaui--pencil] text-xl" />
          </button>
        </>
      )}
      {/* Показываем кнопки записи только для активных воркшопов */}
      {isWorkshopActive() &&
        (workshopChosen ? (
          <button
            onClick={handleCheckOut}
            className="absolute bottom-3 right-1/2 flex translate-x-1/2 transform cursor-pointer items-center justify-center rounded-xl border border-[#ff6b6b]/20 bg-black/40 p-2.5 text-[#ff6b6b] backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-x-1/2 hover:scale-110 hover:transform hover:border-[#ff5252]/40 hover:bg-[rgba(255,107,107,0.2)] hover:text-[#ff5252]"
            title="Check out"
          >
            <span className="icon-[material-symbols--remove] text-xl" />
          </button>
        ) : (
          <button
            disabled={signedPeople === workshop.maxPlaces}
            onClick={handleCheckIn}
            className="absolute bottom-3 right-1/2 flex translate-x-1/2 transform cursor-pointer items-center justify-center rounded-xl border border-[#bcdfbc]/20 bg-black/40 p-2.5 text-[#bcdfbc] backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-x-1/2 hover:scale-110 hover:transform hover:border-[#aad6aa]/40 hover:bg-[rgba(167,202,167,0.2)] hover:text-[#aad6aa] disabled:cursor-not-allowed disabled:opacity-50"
            title="Check in"
          >
            <span className="icon-[material-symbols--add-rounded] text-xl" />
          </button>
        ))}
    </div>
  );
};

export default WorkshopItem;
