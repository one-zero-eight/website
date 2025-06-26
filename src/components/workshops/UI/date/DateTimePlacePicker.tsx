import React from "react";

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
    <div className="flex flex-col gap-4 my-2">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-[2]">
          <label className="text-white text-xs font-medium uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white/10 text-white text-sm transition-all duration-300 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-white text-xs font-medium uppercase tracking-wider">Room</label>
          <input
            type="text"
            value={room}
            onChange={(e) => onRoomChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white/10 text-white text-sm transition-all duration-300 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
            placeholder="Room"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-white text-xs font-medium uppercase tracking-wider">Places</label>
          <input
            type="text"
            value={maxPlaces}
            onChange={(e) => onMaxPlacesChange(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white/10 text-white text-sm transition-all duration-300 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
            placeholder="limit"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-white text-xs font-medium uppercase tracking-wider">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white/10 text-white text-sm transition-all duration-300 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-white text-xs font-medium uppercase tracking-wider">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white/10 text-white text-sm transition-all duration-300 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
