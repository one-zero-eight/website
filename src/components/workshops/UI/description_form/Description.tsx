import React from "react";
import "./Description.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
};

interface WorkshopProps {
  workshop: Workshop | null;
}

const Description: React.FC<WorkshopProps> = ({ workshop }) => {
  if (!workshop) return <div>No description</div>;

  return (
    <div className="description-content">
      <h2 className="description-title">{workshop.title}</h2>
      <p>{workshop.body}</p>
      <div className="description-body">
        {workshop.date} {workshop.startTime} - {workshop.endTime} room:{" "}
        {workshop.room}{" "}
      </div>
    </div>
  );
};

export default Description;
