import { useToast } from "@/components/toast";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { useSaveState, useWakeLock } from "./utils";
interface UseTimerTypes {
  title: string;
  setShowStopDialog: Dispatch<SetStateAction<boolean>>;
  setShowTimeUpMessage: Dispatch<SetStateAction<boolean>>;
}

export const useTimer = ({
  title,
  setShowStopDialog,
  setShowTimeUpMessage,
}: UseTimerTypes) => {
  const [time, setTime] = useState<string>("00:00:00");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [initialSeconds, setInitialSeconds] = useState<number>(0);
  const [hours, setHours] = useState<string>("00");
  const [minutes, setMinutes] = useState<string>("00");
  const [seconds, setSeconds] = useState<string>("00");
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const { showInfo, showSuccess, showError, showWarning } = useToast();
  const wakeLock = useWakeLock();

  const { saveState } = useSaveState({
    title,
    initialSeconds,
    isRunning,
    isPaused,
    targetEndTime,
  });
  const timerRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const hasAdjustedTimerRef = useRef<boolean>(false);

  const handleTimeBlur = () => {
    const parts = time.split(":");
    if (parts.length === 3) {
      const [hours = "0", minutes = "0", seconds = "0"] = parts;

      const h = Math.min(99, Math.max(0, parseInt(hours, 10) || 0)); // Cap at 99
      const m = Math.min(59, Math.max(0, parseInt(minutes, 10) || 0));
      const s = Math.min(59, Math.max(0, parseInt(seconds, 10) || 0));

      const formattedTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      setTime(formattedTime);
      setSecondsLeft(h * 3600 + m * 60 + s);
    } else {
      setTime("00:00:00");
      setSecondsLeft(0);
    }
  };

  const handleStart = async () => {
    const totalSeconds =
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10);

    if (totalSeconds === 0) {
      showError("Cannot set the timer to 0 seconds");
      return;
    }

    const endTime = Date.now() + totalSeconds * 1000;

    hasAdjustedTimerRef.current = false; // Reset the adjustment flag for new timer
    setIsRunning(true);
    setIsPaused(false);
    setSecondsLeft(totalSeconds);
    setInitialSeconds(totalSeconds);
    setTargetEndTime(endTime);
    setShowTimeUpMessage(false);

    await wakeLock.request();

    showSuccess("The timer started");
  };

  const handleStartUntilTime = async (targetDate: Date) => {
    const now = Date.now();
    const totalSeconds = Math.max(
      0,
      Math.round((targetDate.getTime() - now) / 1000),
    );

    if (totalSeconds === 0) {
      showError("The selected time must be in the future");
      return;
    }

    const MAX_SECONDS = 99 * 3600 + 99 * 60 + 99;
    if (totalSeconds > MAX_SECONDS) {
      showError("The maximum countdown duration is 99:99:99");
      return;
    }

    const endTime = targetDate.getTime();

    hasAdjustedTimerRef.current = false; // Reset the adjustment flag for new timer
    setIsRunning(true);
    setIsPaused(false);
    setSecondsLeft(totalSeconds);
    setInitialSeconds(totalSeconds);
    setTargetEndTime(endTime);
    setShowTimeUpMessage(false);

    // Update display
    formatTime(totalSeconds);

    await wakeLock.request();

    showSuccess("The timer started");
  };
  const setPresetTime = (hours: number, minutes: number) => {
    if (isRunning) return; // Don't allow changing time while timer is running

    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");

    setHours(formattedHours);
    setMinutes(formattedMinutes);
    setSeconds("00");
    setTime(`${formattedHours}:${formattedMinutes}:00`);
    setSecondsLeft(hours * 3600 + minutes * 60);
  };
  const handlePause = () => {
    if (isPaused) {
      // Resuming the timer
      const newEndTime = Date.now() + secondsLeft * 1000;

      setTargetEndTime(newEndTime);
      setIsPaused(false);

      showInfo("The timer resumed");
    } else {
      // Pausing the timer
      setTargetEndTime(null);
      setIsPaused(true);
      saveState(secondsLeft);
      showInfo("The timer paused");
    }
  };

  const confirmStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setTime("00:00:00");
    setHours("00");
    setMinutes("00");
    setSeconds("00");
    setSecondsLeft(0);
    setInitialSeconds(0);
    setTargetEndTime(null);
    setShowStopDialog(false);
    hasAdjustedTimerRef.current = false; // Reset the adjustment flag
    localStorage.removeItem("timerState");

    wakeLock.release();

    showInfo("The timer stopped");
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "H" | "M" | "S",
  ) => {
    const input = e.currentTarget;
    const cursorPosition = input.selectionStart || 0;
    const inputLength = input.value.length;

    // Backspace at beginning - move to previous field
    if (e.key === "Backspace" && cursorPosition === 0) {
      e.preventDefault();
      if (type === "M") {
        hoursRef.current?.focus();
        const hoursLength = hoursRef.current?.value.length || 0;
        setTimeout(() => {
          hoursRef.current?.setSelectionRange(hoursLength, hoursLength);
        }, 0);
      } else if (type === "S") {
        minutesRef.current?.focus();
        const minutesLength = minutesRef.current?.value.length || 0;
        setTimeout(() => {
          minutesRef.current?.setSelectionRange(minutesLength, minutesLength);
        }, 0);
      }
      return;
    }

    // Backspace handling - shift digits left and pad with 0
    if (e.key === "Backspace" && cursorPosition > 0) {
      e.preventDefault();
      const currentValue = input.value;
      // Remove character at cursor position - 1
      const newValue =
        currentValue.slice(0, cursorPosition - 1) +
        currentValue.slice(cursorPosition);

      // Pad with 0 on the right to maintain 2 digits
      const paddedValue = (newValue + "0").slice(0, 2);
      const newCursorPos = cursorPosition - 1;

      // Update the appropriate field
      if (type === "H") {
        setHours(paddedValue);
        setTime(`${paddedValue}:${minutes}:${seconds}`);
        setSecondsLeft(
          parseInt(paddedValue, 10) * 3600 +
            parseInt(minutes, 10) * 60 +
            parseInt(seconds, 10),
        );
        setTimeout(
          () => hoursRef.current?.setSelectionRange(newCursorPos, newCursorPos),
          0,
        );
      } else if (type === "M") {
        setMinutes(paddedValue);
        setTime(`${hours}:${paddedValue}:${seconds}`);
        setSecondsLeft(
          parseInt(hours, 10) * 3600 +
            parseInt(paddedValue, 10) * 60 +
            parseInt(seconds, 10),
        );
        setTimeout(
          () =>
            minutesRef.current?.setSelectionRange(newCursorPos, newCursorPos),
          0,
        );
      } else {
        setSeconds(paddedValue);
        setTime(`${hours}:${minutes}:${paddedValue}`);
        setSecondsLeft(
          parseInt(hours, 10) * 3600 +
            parseInt(minutes, 10) * 60 +
            parseInt(paddedValue, 10),
        );
        setTimeout(
          () =>
            secondsRef.current?.setSelectionRange(newCursorPos, newCursorPos),
          0,
        );
      }
      return;
    }

    // Right arrow at the end of input - move to next field
    if (e.key === "ArrowRight" && cursorPosition === inputLength) {
      e.preventDefault();
      if (type === "H") {
        minutesRef.current?.focus();
        minutesRef.current?.setSelectionRange(0, 0);
      } else if (type === "M") {
        secondsRef.current?.focus();
        secondsRef.current?.setSelectionRange(0, 0);
      }
    }

    // Left arrow at the beginning of input - move to previous field
    if (e.key === "ArrowLeft" && cursorPosition === 0) {
      e.preventDefault();
      if (type === "M") {
        hoursRef.current?.focus();
        hoursRef.current?.setSelectionRange(
          hoursRef.current.value.length,
          hoursRef.current.value.length,
        );
      } else if (type === "S") {
        minutesRef.current?.focus();
        minutesRef.current?.setSelectionRange(
          minutesRef.current.value.length,
          minutesRef.current.value.length,
        );
      }
    }
  };
  const handleSetTime = (value: string, type: "H" | "M" | "S") => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    const numValue = value === "" ? 0 : parseInt(value, 10);

    if (type === "H") {
      const clampedValue = Math.min(99, numValue); // Cap at 99
      const formatted = clampedValue.toString().padStart(2, "0");
      setHours(formatted);
      setTime(`${formatted}:${minutes}:${seconds}`);
      setSecondsLeft(
        parseInt(formatted, 10) * 3600 +
          parseInt(minutes, 10) * 60 +
          parseInt(seconds, 10),
      );

      if (value.length >= 2) {
        minutesRef.current?.focus();
        setTimeout(() => minutesRef.current?.select(), 0);
      }
    } else if (type === "M") {
      const values = numValue.toLocaleString().slice(-2);
      if (Number(values) > 59) {
        setMinutes(`0${values[1]}`);
        setTime(`${hours}:0${values[1]}:${seconds}`);
        setSecondsLeft(
          parseInt(hours, 10) * 3600 +
            parseInt(values[1], 10) * 60 +
            parseInt(seconds, 10),
        );
        secondsRef.current?.focus();
        setTimeout(() => secondsRef.current?.select(), 0);
        return;
      }
      const formatted = values.toString().padStart(2, "0");
      setMinutes(formatted);
      setTime(`${hours}:${formatted}:${seconds}`);
      setSecondsLeft(
        parseInt(hours, 10) * 3600 +
          parseInt(formatted, 10) * 60 +
          parseInt(seconds, 10),
      );

      // Auto-focus next field when user enters 2 digits
      if (value.length >= 2) {
        secondsRef.current?.focus();
        setTimeout(() => secondsRef.current?.select(), 0);
      }
    } else {
      const values = numValue.toLocaleString().slice(-2);
      if (Number(values) > 59) {
        setSeconds(`0${values[1]}`);
        setTime(`${hours}:${minutes}:0${values[1]}`);
        setSecondsLeft(
          parseInt(hours, 10) * 3600 +
            parseInt(minutes, 10) * 60 +
            parseInt(values[1], 10),
        );
        return;
      }
      const formatted = values.toString().padStart(2, "0");
      setSeconds(formatted);
      setTime(`${hours}:${minutes}:${formatted}`);
      setSecondsLeft(
        parseInt(hours, 10) * 3600 +
          parseInt(minutes, 10) * 60 +
          parseInt(formatted, 10),
      );
      // Seconds is the last field, no auto-focus needed
    }
  };
  const addTimeToRunningTimer = (minutesToAdd: number) => {
    if (!isRunning) return; // Only work when timer is running (including paused state)

    const MAX_SECONDS = 99 * 3600 + 99 * 60 + 99; // 99:99:99 in seconds
    const secondsToAdd = minutesToAdd * 60;

    if (isPaused) {
      // Timer is paused - update seconds left and display directly
      const newSecondsLeft = Math.min(secondsLeft + secondsToAdd, MAX_SECONDS);
      const actualSecondsAdded = newSecondsLeft - secondsLeft;

      if (actualSecondsAdded === 0) {
        showWarning("Timer is already at maximum (99:59:59)");
        return;
      }

      const newInitialSeconds = initialSeconds + actualSecondsAdded;
      setInitialSeconds(newInitialSeconds);
      setSecondsLeft(newSecondsLeft);
      formatTime(newSecondsLeft);

      // Save to localStorage with new paused time
      const stateToSave = {
        title,
        initialSeconds: newInitialSeconds,
        isRunning: true,
        isPaused: true,
        pausedSecondsLeft: newSecondsLeft,
      };
      localStorage.setItem("timerState", JSON.stringify(stateToSave));

      if (newSecondsLeft >= MAX_SECONDS) {
        showWarning("Timer set to maximum (99:59:59)");
      } else {
        showSuccess(
          `Added ${Math.round(actualSecondsAdded / 60)} minute${Math.round(actualSecondsAdded / 60) > 1 ? "s" : ""} to timer`,
        );
      }
    } else if (targetEndTime) {
      // Timer is actively running - calculate current remaining time and add
      const now = Date.now();
      const currentRemainingSeconds = Math.max(
        0,
        Math.round((targetEndTime - now) / 1000),
      );

      const newSecondsLeft = Math.min(
        currentRemainingSeconds + secondsToAdd,
        MAX_SECONDS,
      );
      const actualSecondsAdded = newSecondsLeft - currentRemainingSeconds;

      if (actualSecondsAdded === 0) {
        showWarning("Timer is already at maximum (99:59:59)");
        return;
      }

      const millisecondsToAdd = actualSecondsAdded * 1000;
      const newTargetEndTime = targetEndTime + millisecondsToAdd;
      const newInitialSeconds = initialSeconds + actualSecondsAdded;

      setInitialSeconds(newInitialSeconds);
      setTargetEndTime(newTargetEndTime);

      // Immediately update the display
      const remainingSeconds = Math.max(
        0,
        Math.round((newTargetEndTime - now) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      formatTime(remainingSeconds);

      // Save to localStorage with new target end time
      const stateToSave = {
        title,
        initialSeconds: newInitialSeconds,
        isRunning: true,
        isPaused: false,
        targetEndTime: newTargetEndTime,
      };
      localStorage.setItem("timerState", JSON.stringify(stateToSave));

      if (newSecondsLeft >= MAX_SECONDS) {
        showWarning("Timer set to maximum (99:59:59)");
      } else {
        showSuccess(
          `Added ${Math.round(actualSecondsAdded / 60)} minute${Math.round(actualSecondsAdded / 60) > 1 ? "s" : ""} to timer`,
        );
      }
    }
  };
  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);
    setTime("00:00:00");
    setHours("00");
    setMinutes("00");
    setSeconds("00");
    setInitialSeconds(0);
    setTargetEndTime(null);
    setShowTimeUpMessage(true);
    hasAdjustedTimerRef.current = false; // Reset the adjustment flag
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    localStorage.removeItem("timerState");

    await wakeLock.release();

    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, 10000);
    }

    showSuccess("Time is up!");
  }, [wakeLock]);

  const formatTime = useCallback(
    (totalSeconds: number) => {
      if (isNaN(totalSeconds) || totalSeconds < 0) {
        setTime("00:00:00");
        setHours("00");
        setMinutes("00");
        setSeconds("00");
        return;
      }

      // Cap at 99:99:99
      const MAX_SECONDS = 99 * 3600 + 99 * 60 + 99;
      const cappedSeconds = Math.min(totalSeconds, MAX_SECONDS);

      const h = Math.floor(cappedSeconds / 3600);
      const m = Math.floor((cappedSeconds % 3600) / 60);
      const s = cappedSeconds % 60;

      const formattedHours = h.toString().padStart(2, "0");
      const formattedMinutes = m.toString().padStart(2, "0");
      const formattedSeconds = s.toString().padStart(2, "0");

      setHours(formattedHours);
      setMinutes(formattedMinutes);
      setSeconds(formattedSeconds);
      setTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    },
    [setHours, setMinutes, setSeconds, setTime],
  );
  return {
    state: {
      hours,
      minutes,
      seconds,
      secondsLeft,
      initialSeconds,
      targetEndTime,
      isRunning,
      isPaused,
    },

    refs: {
      hoursRef,
      minutesRef,
      secondsRef,
      audioRef,
      timerRef,
      hasAdjustedTimerRef,
    },

    setters: {
      setSecondsLeft,
      setInitialSeconds,
      setTargetEndTime,
      setIsRunning,
      setIsPaused,
    },

    handlers: {
      handleStart,
      handlePause,
      handleTimeBlur,
      handleKeyDown,
      handleSetTime,
      handleTimerComplete,
      addTimeToRunningTimer,
      confirmStop,
      setPresetTime,
      handleStartUntilTime,
    },

    utils: {
      formatTime,
    },
  };
};
