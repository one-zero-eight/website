import React, { useEffect, useState } from "react";
import "./WorkshopList.css";
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
  remainPlaces?: number; // Добавляем поле для оставшихся мест
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
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был не по кнопкам
    const target = e.target as HTMLElement;
    if (!target.closest("button")) {
      openDescription(workshop);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU");
  };
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString;
  };

  const handleRoomClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
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

        if (!checkinsError && checkinsData) {
          setSignedPeople(parseInt(checkinsData.checkIns));
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
        alert("You check in " + data);
      } else {
        alert("Impossible to check in" + error);
      }
    } catch (error) {
      console.error("Check-in failed", error);
      alert("Error occur when trying to check in.");
    }
  };

  const handleCheckOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
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
        alert("You check out " + data);
      } else {
        alert("Impossible to check out");
      }
    } catch (error) {
      console.error("Check-out failed", error);
      alert("Error occur when trying to check out");
    }
  };

  return (
    <div className="workshop-tile" onClick={handleContentClick}>
      <p className="workshop-places">
        {" "}
        {workshop.maxPlaces > 0
          ? signedPeople + "/" + workshop.maxPlaces
          : "No limit on number of people"}
      </p>
      <h3> {workshop.title}</h3>
      {workshop.date && (
        <div className="workshop-datetime">
          <p>{formatDate(workshop.date)}</p>
          {workshop.startTime && workshop.endTime && (
            <p>
              {formatTime(workshop.startTime)} - {formatTime(workshop.endTime)}
            </p>
          )}{" "}
          {workshop.room && (
            <p>
              <strong>Room:</strong>{" "}
              <span
                onClick={handleRoomClick}
                className="cursor-pointer text-brand-violet hover:underline"
                title="Click to view on map"
              >
                {workshop.room}
              </span>
            </p>
          )}
        </div>
      )}
      {/* Показываем кнопки управления только для администраторов */}
      {currentUserRole === "admin" && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(workshop);
            }}
            className="delete-button"
            title="Delete workshop"
          >
            <span className="icon-[material-symbols--delete-outline-rounded] text-xl" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              edit(workshop);
            }}
            className="edit-button"
            title="Edit workshop"
          >
            <span className="icon-[mynaui--pencil] text-xl" />
          </button>
        </>
      )}
      {workshopChosen ? (
        <button
          disabled={signedPeople === workshop.maxPlaces}
          onClick={handleCheckOut}
          className="check-out-button"
          title="Check out"
        >
          <span className="icon-[material-symbols--remove] text-xl" />
        </button>
      ) : (
        <button
          onClick={handleCheckIn}
          className="check-in-button"
          title="Check in"
        >
          <span className="icon-[material-symbols--add-rounded] text-xl" />
        </button>
      )}
    </div>
  );
};

export default WorkshopItem;
