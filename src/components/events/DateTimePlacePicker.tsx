export function DateTimePlacePicker({
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
}: {
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
}) {
  return (
    <div className="my-2 flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-2 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-field w-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-hidden transition-all duration-300 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Room
          </label>
          <input
            type="text"
            value={room}
            onChange={(e) => onRoomChange(e.target.value)}
            className="input"
            placeholder="Room"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Places
          </label>
          <div className="relative">
            <input
              type="text"
              value={isPlacesDisabled ? "" : maxPlaces}
              onChange={(e) => onMaxPlacesChange(Number(e.target.value))}
              disabled={isPlacesDisabled}
              className="input"
              placeholder={isPlacesDisabled ? "" : "limit"}
            />
            {isPlacesDisabled && (
              <span className="icon-[mdi--infinity] absolute top-1/2 left-3 -translate-y-1/2 text-xl text-gray-700 dark:text-white" />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="rounded-field w-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-hidden transition-all duration-300 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="rounded-field w-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-hidden transition-all duration-300 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>
    </div>
  );
}
