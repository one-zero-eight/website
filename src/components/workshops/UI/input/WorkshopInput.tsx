import React from "react";
import classes from "./WorkshopInput.module.css";
type WorkshopInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const WorkshopInput: React.FC<WorkshopInputProps> = (props) => {
  return <input className={classes.workshopInput} {...props} />;
};

export default WorkshopInput;
