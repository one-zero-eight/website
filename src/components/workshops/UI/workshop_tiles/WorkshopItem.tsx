import React, { useState } from "react";
import "./WorkshopList.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
};

type WorkshopItemProps = {
  workshop: Workshop;
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
};

const WorkshopItem: React.FC<WorkshopItemProps> = ({
  workshop,
  remove,
  edit,
  openDescription,
}) => {
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

  function renderButton(workshopChosen: boolean) {
    if (workshopChosen) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setWorkshopChosen(false);
            setSignedPeople(signedPeople - 1);
          }}
          className="check-out-button"
          title="Check out"
        >
          <span className="icon-[material-symbols--remove] text-xl" />
        </button>
      );
    } else {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setWorkshopChosen(true);
            setSignedPeople(signedPeople + 1);
          }}
          className="check-in-button"
          title="Check in"
        >
          <span className="icon-[material-symbols--add-rounded] text-xl" />
        </button>
      );
    }
  }

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
          <p>
            <strong>Date:</strong> {formatDate(workshop.date)}
          </p>
          {workshop.startTime && workshop.endTime && (
            <p>
              <strong>Time:</strong> {formatTime(workshop.startTime)} -{" "}
              {formatTime(workshop.endTime)}
            </p>
          )}
          {workshop.room && (
            <p>
              <strong>Room:</strong> {workshop.room}
            </p>
          )}
        </div>
      )}
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
      {renderButton(workshopChosen)}
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
    </div>
  );
};

export default WorkshopItem;
