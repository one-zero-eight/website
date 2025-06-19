import React from "react";
import WorkshopItem from "./WorkshopItem";
import "./WorkshopList.css";

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

type WorkshopListProps = {
  workshops: Workshop[];
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
  currentUserRole: "user" | "admin";
};

const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops,
  remove,
  edit,
  openDescription,
  currentUserRole,
}) => {
  return (
    <div style={{ textAlign: "center" }} className="workshop-list">
      <div className="workshop-grid">
        {/* Тернарное? выражение чтобы плейсходдер рисовать если нет воркшопов */}
        {workshops.length ? (
          workshops.map((workshop) => (
            <WorkshopItem
              remove={remove}
              edit={edit}
              workshop={workshop}
              openDescription={openDescription}
              key={workshop.id}
              currentUserRole={currentUserRole}
            />
          ))
        ) : (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              width: "100%",
              fontSize: "1.3rem",
            }}
          >
            <h2 style={{ color: "gray" }}>No workshops yet!</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkshopList;
