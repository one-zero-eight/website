import React from "react";
import "./Description.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
};

interface WorkshopProps {
  workshop: Workshop | null;
}

const Description: React.FC<WorkshopProps> = ({ workshop }) => {
  if (!workshop) return <div>No description</div>;

  return (
    <div className="description-content">
      <h2 className="description-title">{workshop.title}</h2>
      <div className="description-body">{workshop.body}</div>
    </div>
  );
};

export default Description;
