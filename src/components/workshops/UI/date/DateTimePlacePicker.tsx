import React from "react";
import classes from "./DateTimePlacePicker.module.css";

export interface DateTimePickerProps {
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onRoomChange: (room: string) => void;
  onMaxPlacesChange: (maxPlaces: number) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  date,
  startTime,
  endTime,
  room,
  maxPlaces,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onRoomChange,
  onMaxPlacesChange,
}) => {
  return (
    <div className={classes.dateTimeContainer}>
      <div className={classes.dateRoomGroup}>
        <div className={classes.inputGroup}>
          <label className={classes.label}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className={classes.dateTimeInput}
          />
        </div>

        <div className={classes.inputGroup}>
          <label className={classes.label}>Room</label>
          <input
            type="text"
            value={room}
            onChange={(e) => onRoomChange(e.target.value)}
            className={classes.dateTimeInput}
            placeholder="Room"
          />
        </div>

        <div className={classes.inputGroup}>
          <label className={classes.label}>Places</label>
          <input
            type="text"
            value={maxPlaces}
            onChange={(e) => onMaxPlacesChange(e.target.value)}
            className={classes.dateTimeInput}
            placeholder="limit"
          />
        </div>
      </div>

      <div className={classes.timeGroup}>
        <div className={classes.inputGroup}>
          <label className={classes.label}>Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={classes.dateTimeInput}
          />
        </div>

        <div className={classes.inputGroup}>
          <label className={classes.label}>End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className={classes.dateTimeInput}
          />
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
