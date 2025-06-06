import React from "react";
import "./WorkshopList.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
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
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был не по кнопкам
    if (!(e.target as HTMLElement).closest("button")) {
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
  return (
    <div className="workshop-tile" onClick={handleContentClick}>
      <h3>{workshop.title}</h3>
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          remove(workshop);
        }}
        className="check-in-button"
        title="Check in"
      >
        <span className="icon-[material-symbols--add-rounded] text-xl" />
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
    </div>
  );
};

export default WorkshopItem;
