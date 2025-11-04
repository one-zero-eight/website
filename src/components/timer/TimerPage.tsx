import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONTROL_BUTTON_CLASS,
  ADD_TIME_BUTTON_CLASS,
  PRESET_BUTTON_CLASS,
  PRESET_TIME_OPTIONS,
  ADD_TIME_OPTIONS,
} from "./constants";

interface Toast {
  id: number;
  message: string;
}

const TimerPage = () => {
  const [title, setTitle] = useState<string>("");
  const [time, setTime] = useState<string>("00:00:00");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showStopDialog, setShowStopDialog] = useState<boolean>(false);
  const [showTimeUpMessage, setShowTimeUpMessage] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [initialSeconds, setInitialSeconds] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hours, setHours] = useState<string>("00");
  const [minutes, setMinutes] = useState<string>("00");
  const [seconds, setSeconds] = useState<string>("00");
  const [mode, setMode] = useState<"default" | "fullscreen">("default");
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const timerRef = useRef<number>();
  const toastIdCounter = useRef(0);
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const hasAdjustedTimerRef = useRef<boolean>(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

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

    await releaseWakeLock();

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

    showToast("Time is up!");
  }, []);

  const formatTime = useCallback((totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      setTime("00:00:00");
      setHours("00");
      setMinutes("00");
      setSeconds("00");
      return;
    }

    // Cap at 99:59:59
    const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59;
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
  }, []);

  const saveState = useCallback(
    (seconds?: number) => {
      const stateToSave: any = {
        title,
        initialSeconds,
        isRunning,
        isPaused,
      };

      if (isPaused && seconds !== undefined) {
        // When paused, save the current seconds left
        stateToSave.pausedSecondsLeft = seconds;
      } else if (targetEndTime) {
        // When running, save the target end time
        stateToSave.targetEndTime = targetEndTime;
      }

      localStorage.setItem("timerState", JSON.stringify(stateToSave));
    },
    [title, isRunning, isPaused, initialSeconds, targetEndTime],
  );

  useEffect(() => {
    if (isRunning) {
      saveState(secondsLeft);
    }
  }, [isRunning, isPaused, secondsLeft, saveState]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      requestWakeLock();
    }
  }, [isRunning, isPaused]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setMode("fullscreen");
      } else {
        setMode("default");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleVisibilityChange = useCallback(async () => {
    if (!document.hidden && isRunning && !isPaused && targetEndTime) {
      const now = Date.now();
      const remainingSeconds = Math.max(
        0,
        Math.round((targetEndTime - now) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      formatTime(remainingSeconds);

      if (remainingSeconds === 0) {
        handleTimerComplete();
      }

      await requestWakeLock();
    }
  }, [isRunning, isPaused, targetEndTime, handleTimerComplete, formatTime]);

  useEffect(() => {
    const savedState = localStorage.getItem("timerState");
    if (savedState) {
      try {
        const {
          title: savedTitle,
          targetEndTime: savedTargetEndTime,
          initialSeconds: savedInitialSeconds = 0,
          isRunning: savedIsRunning,
          isPaused: savedIsPaused,
          pausedSecondsLeft,
        } = JSON.parse(savedState);

        setTitle(savedTitle || "");
        setInitialSeconds(savedInitialSeconds);

        if (savedIsPaused && pausedSecondsLeft !== undefined) {
          // Timer is paused - restore the paused time
          setSecondsLeft(pausedSecondsLeft);
          formatTime(pausedSecondsLeft);
          setTargetEndTime(null);
          setIsRunning(true);
          setIsPaused(true);
        } else if (savedIsRunning && savedTargetEndTime) {
          // Timer is running - calculate remaining time based on target end time
          const now = Date.now();
          const remainingSeconds = Math.max(
            0,
            Math.round((savedTargetEndTime - now) / 1000),
          );

          if (remainingSeconds === 0) {
            // Timer has completed while page was closed
            handleTimerComplete();
          } else {
            // Timer is still running - restore it
            setSecondsLeft(remainingSeconds);
            formatTime(remainingSeconds);
            setTargetEndTime(savedTargetEndTime);
            setIsRunning(true);
            setIsPaused(false);
          }
        }
      } catch (error) {
        console.error("Failed to restore timer state:", error);
        localStorage.removeItem("timerState");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleTimerComplete, handleVisibilityChange, formatTime]);

  const showToast = (message: string) => {
    const id = toastIdCounter.current++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired");
      }
    } catch (err) {
      console.error("Failed to acquire wake lock:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Wake Lock released");
      } catch (err) {
        console.error("Failed to release wake lock:", err);
      }
    }
  };

  useEffect(() => {
    if (isRunning && !isPaused && targetEndTime) {
      // Immediately update the display when the interval starts to prevent flicker
      const now = Date.now();
      const remainingMs = targetEndTime - now;
      let adjustedTargetEndTime = targetEndTime;

      // Only do the timing adjustment check if this is a newly started timer (not restored from localStorage)
      // We check if the remaining time is very close to the initial seconds, which means it's a fresh timer start
      const expectedRemainingMs = initialSeconds * 1000;
      const timeLost = expectedRemainingMs - remainingMs;
      const isNewlyStartedTimer = Math.abs(timeLost) < 5000; // Within 5 seconds means it's a fresh start

      // If we've lost more than 200ms from the intended duration due to state update delays,
      // recalculate the end time to ensure the full timer duration runs.
      // Only do this once per timer session and only for newly started timers (not restored ones)
      if (
        timeLost > 200 &&
        timeLost < 5000 &&
        !hasAdjustedTimerRef.current &&
        isNewlyStartedTimer
      ) {
        adjustedTargetEndTime = now + initialSeconds * 1000;
        hasAdjustedTimerRef.current = true;
        // Update the state for localStorage persistence
        setTargetEndTime(adjustedTargetEndTime);
        return; // Exit early and let the effect re-run with the new targetEndTime
      }

      const initialRemainingMs = adjustedTargetEndTime - now;
      const initialRemainingSeconds = Math.max(
        0,
        Math.round(initialRemainingMs / 1000),
      );

      setSecondsLeft(initialRemainingSeconds);
      formatTime(initialRemainingSeconds);

      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = adjustedTargetEndTime - now;
        const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));

        if (remainingMs <= 0) {
          handleTimerComplete();
          return;
        }

        setSecondsLeft(remainingSeconds);
        formatTime(remainingSeconds);

        if (
          Math.floor(remainingMs / 1000) !==
          Math.floor((remainingMs - 100) / 1000)
        ) {
          saveState();
        }
      }, 100);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    isRunning,
    isPaused,
    targetEndTime,
    initialSeconds,
    handleTimerComplete,
    saveState,
    formatTime,
  ]);

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
      showToast("Error: set the right time");
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

    await requestWakeLock();

    showToast("The timer started");
  };

  const handlePause = () => {
    if (isPaused) {
      // Resuming the timer
      const newEndTime = Date.now() + secondsLeft * 1000;

      setTargetEndTime(newEndTime);
      setIsPaused(false);

      showToast("The timer resumed");
    } else {
      // Pausing the timer
      setTargetEndTime(null);
      setIsPaused(true);
      saveState(secondsLeft);
      showToast("The timer stopped");
    }
  };

  const handleStop = () => {
    setShowStopDialog(true);
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

    await releaseWakeLock();

    showToast("The timer stopped");
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    setTimeout(() => {
      input.select();
    }, 0);
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

  const addTimeToRunningTimer = (minutesToAdd: number) => {
    if (!isRunning) return; // Only work when timer is running (including paused state)

    const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59; // 99:59:59 in seconds
    const secondsToAdd = minutesToAdd * 60;

    if (isPaused) {
      // Timer is paused - update seconds left and display directly
      const newSecondsLeft = Math.min(secondsLeft + secondsToAdd, MAX_SECONDS);
      const actualSecondsAdded = newSecondsLeft - secondsLeft;

      if (actualSecondsAdded === 0) {
        showToast("Timer is already at maximum (99:59:59)");
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
        showToast("Timer set to maximum (99:59:59)");
      } else {
        showToast(
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
        showToast("Timer is already at maximum (99:59:59)");
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
        showToast("Timer set to maximum (99:59:59)");
      } else {
        showToast(
          `Added ${Math.round(actualSecondsAdded / 60)} minute${Math.round(actualSecondsAdded / 60) > 1 ? "s" : ""} to timer`,
        );
      }
    }
  };

  const dismissTimeUpMessage = () => {
    setShowTimeUpMessage(false);
    // Stop the sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset to beginning
    }
  };

  const switchFullscreen = () => {
    const timerContainer = document.getElementById("timer-container");
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      timerContainer?.requestFullscreen();
    }
  };
  return (
    <div
      className="bg-base-100 relative flex grow flex-col items-center p-4 md:p-8"
      id="timer-container"
    >
      <button
        className="bg-inh-primary hover:bg-inh-primary-hover text-base-content rounded-box absolute top-4 right-4 flex h-12 w-12 items-center justify-center text-3xl transition-all"
        onClick={() => {
          switchFullscreen();
        }}
      >
        {mode === "fullscreen" ? (
          <span className="icon-[material-symbols--fullscreen-exit]" />
        ) : (
          <span className="icon-[material-symbols--fullscreen]" />
        )}
      </button>
      <div className="mb-6 flex w-full flex-col items-center gap-4 p-4 md:mb-12">
        <textarea
          ref={titleTextareaRef}
          placeholder="Timer title..."
          value={title}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setTitle(e.target.value)
          }
          onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            const newHeight = Math.max(target.scrollHeight, 60);
            target.style.height = `${newHeight}px`;
          }}
          rows={1}
          className="rounded-box w-full max-w-[900px] resize-none overflow-hidden border-none bg-transparent px-6 py-3 text-center text-2xl leading-tight font-bold transition-all duration-300 outline-none placeholder:text-gray-400 focus:bg-gray-100/50 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl dark:focus:bg-gray-900/50"
          style={{
            minHeight: "60px",
          }}
        />
      </div>

      {/* Quick Timer Presets */}
      {!isRunning && (
        <div className="mb-6 flex flex-col items-center gap-2 px-4 sm:gap-3 md:mb-8 md:gap-4 md:px-8">
          <span className="text-base-content mr-1 w-full self-center text-center text-sm font-semibold sm:mr-2 sm:w-auto sm:text-base md:text-lg">
            Quick Presets:{" "}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESET_TIME_OPTIONS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPresetTime(preset.hours, preset.minutes)}
                className={PRESET_BUTTON_CLASS}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-full grow items-center justify-center">
        <div className="wc">
          <div className="text-primary flex w-full max-w-[90vw] shrink-0 items-center justify-center gap-1 text-5xl sm:gap-2 sm:text-6xl md:w-[800px] md:text-7xl lg:text-[150px]">
            <input
              ref={hoursRef}
              type="text"
              size={15}
              value={hours}
              onChange={(e) => handleSetTime(e.target.value, "H")}
              onKeyDown={(e) => handleKeyDown(e, "H")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              className="w-auto min-w-0 bg-transparent p-0 text-center text-5xl outline-none sm:text-6xl md:text-7xl lg:text-[160px]"
            />{" "}
            <span> : </span>
            <input
              ref={minutesRef}
              type="text"
              size={15}
              value={minutes}
              onChange={(e) => handleSetTime(e.target.value, "M")}
              onKeyDown={(e) => handleKeyDown(e, "M")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              className="w-auto min-w-0 bg-transparent p-0 text-center text-5xl outline-none sm:text-6xl md:text-7xl lg:text-[160px]"
            />
            <span> : </span>
            <input
              ref={secondsRef}
              type="text"
              size={15}
              value={seconds}
              onChange={(e) => handleSetTime(e.target.value, "S")}
              onKeyDown={(e) => handleKeyDown(e, "S")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              className="w-auto min-w-0 bg-transparent p-0 text-center text-5xl outline-none sm:text-6xl md:text-7xl lg:text-[160px]"
            />
          </div>

          {/* Progress Bar */}
          {isRunning && initialSeconds > 0 && (
            <div className="mx-auto my-6 w-full max-w-[90vw] px-4 sm:my-8 md:my-12 md:max-w-[900px] md:px-8">
              <div className="relative h-6 w-full overflow-hidden rounded-[25px] bg-gray-300 shadow-[0_4px_15px_rgba(0,0,0,0.15)] sm:h-8 md:h-10">
                <div
                  className="bg-primary h-full rounded-[25px] shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(secondsLeft / initialSeconds) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="m-[1.5rem_0_2rem] flex w-full flex-wrap justify-center gap-3 p-[0_1rem] sm:m-[2rem_0_2.5rem] sm:gap-4 md:m-[2rem_0_3rem] md:gap-6 md:p-0">
            {!isRunning ? (
              <button onClick={handleStart} className={CONTROL_BUTTON_CLASS}>
                <span className="icon-[material-symbols--play-arrow] text-2xl sm:text-3xl" />
                Start
              </button>
            ) : (
              <>
                <button onClick={handlePause} className={CONTROL_BUTTON_CLASS}>
                  {isPaused ? (
                    <>
                      <span className="icon-[material-symbols--play-arrow] text-2xl sm:text-3xl" />
                      Resume
                    </>
                  ) : (
                    <>
                      <span className="icon-[material-symbols--pause] text-2xl sm:text-3xl" />
                      Pause
                    </>
                  )}
                </button>
                <button onClick={handleStop} className={CONTROL_BUTTON_CLASS}>
                  <span className="icon-[material-symbols--stop] text-2xl sm:text-3xl" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showStopDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStopDialog(false);
            }
          }}
        >
          <div
            className="sm:rounded-box w-[90%] max-w-[32rem] rounded-xl border border-purple-500 bg-white p-5 text-gray-900 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] transition-all duration-300 sm:p-8 dark:bg-gray-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 sm:mb-6">
              <h3 className="mb-2 text-xl font-semibold sm:mb-3 sm:text-2xl">
                Stop Timer
              </h3>
              <p className="text-sm text-gray-400 sm:text-base">
                Are you sure you want to stop the timer? This action cannot be
                undone.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3 sm:mt-8 sm:gap-4">
              <button
                onClick={() => setShowStopDialog(false)}
                className="min-w-[100px] cursor-pointer rounded-3xl border border-black/10 bg-slate-100 px-5 py-2.5 text-sm font-medium text-gray-900 transition-all duration-300 hover:bg-black/5 sm:min-w-[120px] sm:px-6 sm:py-3 sm:text-base dark:border-white/20 dark:bg-gray-900 dark:text-white dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                className="min-w-[100px] cursor-pointer rounded-3xl border-none bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-red-600 sm:min-w-[120px] sm:px-6 sm:py-3 sm:text-base"
              >
                Stop Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time's Up Message */}
      {showTimeUpMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={dismissTimeUpMessage}
        >
          <div
            className="animate-in fade-in zoom-in rounded-box relative mx-4 w-full max-w-2xl bg-white p-6 text-center shadow-2xl duration-300 sm:rounded-3xl sm:p-8 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-5xl sm:mb-6 sm:text-6xl md:text-7xl lg:text-8xl">
              ⏰
            </div>
            <h2 className="text-primary mb-3 text-3xl font-bold sm:text-4xl md:mb-4 md:text-5xl lg:text-6xl">
              Time's Up!
            </h2>
            <button
              onClick={dismissTimeUpMessage}
              className="border-primary bg-primary rounded-field mt-2 cursor-pointer border-2 px-6 py-2 text-base font-bold text-white transition-all duration-300 hover:bg-purple-700 hover:shadow-xl sm:px-8 sm:py-3 sm:text-lg md:mt-4 md:rounded-xl md:px-12 md:py-4 md:text-xl lg:text-2xl"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Add Time Buttons - Show when timer is running */}
      {isRunning && (
        <div className="mb-6 flex flex-col items-center gap-2 px-4 sm:gap-3 md:mb-8">
          <span className="text-base-content mr-1 w-full self-center text-center text-sm font-semibold sm:mr-2 sm:w-auto sm:text-base md:text-lg">
            More time:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {ADD_TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => addTimeToRunningTimer(minutes)}
                className={ADD_TIME_BUTTON_CLASS}
              >
                +{minutes} min
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-center gap-3 sm:right-6 sm:bottom-6 sm:left-auto sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="w-full max-w-[min(350px,90vw)] min-w-[min(250px,80vw)] cursor-pointer rounded-3xl border border-purple-500 bg-white p-3 pr-5 text-center text-sm text-gray-900 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-1px_rgba(0,0,0,0.1)] transition-[transform_0.2s_ease,opacity_0.2s_ease] hover:opacity-80 sm:w-auto sm:max-w-[min(400px,90vw)] sm:min-w-[min(300px,80vw)] sm:p-4 sm:pr-6 sm:text-left sm:text-base sm:hover:translate-x-[-5px] dark:bg-gray-900 dark:text-white"
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Hidden audio element for timer completion sound */}
      <audio ref={audioRef} src="/sound_timer.wav" preload="auto" loop />
    </div>
  );
};

export default TimerPage;
