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
  isPlacesDisabled?: boolean;
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
  isPlacesDisabled,
}) => {
  return (
    <div className="my-2 flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-[2] flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white">
            Room
          </label>
          <input
            type="text"
            value={room}
            onChange={(e) => onRoomChange(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
            placeholder="Room"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white">
            Places
          </label>
          <div className="relative">
            <input
              type="text"
              value={isPlacesDisabled ? "" : maxPlaces}
              onChange={(e) => onMaxPlacesChange(Number(e.target.value))}
              disabled={isPlacesDisabled}
              className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
              placeholder={isPlacesDisabled ? "" : "limit"}
            />
            {isPlacesDisabled && (
              <span className="icon-[mdi--infinity] absolute left-3 top-1/2 -translate-y-1/2 text-xl text-white" />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
