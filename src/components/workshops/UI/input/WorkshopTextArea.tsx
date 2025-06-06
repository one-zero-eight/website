import React from "react";
import classes from "./WorkshopTextArea.module.css";

type WorkshopTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const WorkshopTextArea: React.FC<WorkshopTextAreaProps> = (props) => {
  return <textarea className={classes.workshopTextArea} {...props} />;
};

export default WorkshopTextArea;
