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
};

type WorkshopListProps = {
  workshops: Workshop[];
  title: string;
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
  token: string | null;
};

const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops,
  title,
  remove,
  edit,
  openDescription,
  token,
}) => {
  return (
    <div style={{ textAlign: "center" }} className="workshop-list">
      <h1 style={{ fontSize: "2rem" }}>{title}</h1>
      <div className="workshop-grid">
        {/* Тернарное? выражение чтобы плейсходдер рисовать если нет воркшопов */}
        {workshops.length ? (
          workshops.map((workshop) => (
            <WorkshopItem
              remove={remove}
              edit={edit}
              workshop={workshop}
              openDescription={openDescription}
              token={token}
              key={workshop.id}
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
