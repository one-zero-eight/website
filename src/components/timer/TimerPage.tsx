import { useCallback, useEffect, useRef, useState } from "react";
import "./timerstyles.css";

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    localStorage.removeItem("timerState");

    await releaseWakeLock();

    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
    }

    showToast("Time is up!");
  }, []);

  useEffect(() => {
    if (isRunning) {
      saveState(secondsLeft);
    }
  }, [isPaused]);

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

  const handleVisibilityChange = useCallback(async () => {
    if (!document.hidden && isRunning && !isPaused && targetEndTime) {
      const now = Date.now();
      const remainingSeconds = Math.max(
        0,
        Math.floor((targetEndTime - now) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      formatTime(remainingSeconds);

      if (remainingSeconds === 0) {
        handleTimerComplete();
      }

      await requestWakeLock();
    }
  }, [isRunning, isPaused, targetEndTime, handleTimerComplete]);

  useEffect(() => {
    const savedState = localStorage.getItem("timerState");
    if (savedState) {
      const {
        title: savedTitle,
        targetEndTime: savedTargetEndTime,
        initialSeconds: savedInitialSeconds = 0,
        isRunning: savedIsRunning,
        isPaused: savedIsPaused,
        pausedSecondsLeft,
      } = JSON.parse(savedState);

      setTitle(savedTitle);
      setInitialSeconds(savedInitialSeconds);
      setIsRunning(savedIsRunning);
      setIsPaused(savedIsPaused);

      if (savedIsPaused && pausedSecondsLeft !== undefined) {
        setSecondsLeft(pausedSecondsLeft);
        formatTime(pausedSecondsLeft);
        setTargetEndTime(null);
      } else if (savedIsRunning && savedTargetEndTime) {
        const now = Date.now();
        const remainingSeconds = Math.max(
          0,
          Math.floor((savedTargetEndTime - now) / 1000),
        );
        setSecondsLeft(remainingSeconds);
        setTargetEndTime(savedTargetEndTime);
        formatTime(remainingSeconds);

        if (remainingSeconds === 0) {
          handleTimerComplete();
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleTimerComplete, handleVisibilityChange]);

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
    if (isRunning && !isPaused && targetEndTime) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = targetEndTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

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
  }, [isRunning, isPaused, targetEndTime, handleTimerComplete, saveState]);

  const formatTime = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      setTime("00:00:00");
      setHours("00");
      setMinutes("00");
      setSeconds("00");
      return;
    }
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const formattedHours = h.toString().padStart(2, "0");
    const formattedMinutes = m.toString().padStart(2, "0");
    const formattedSeconds = s.toString().padStart(2, "0");

    setHours(formattedHours);
    setMinutes(formattedMinutes);
    setSeconds(formattedSeconds);
    setTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
  };

  const handleTimeBlur = () => {
    const parts = time.split(":");
    if (parts.length === 3) {
      const [hours = "0", minutes = "0", seconds = "0"] = parts;

      const h = Math.max(0, parseInt(hours, 10) || 0);
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
      const newEndTime = Date.now() + secondsLeft * 1000;
      setTargetEndTime(newEndTime);
      setIsPaused(false);
      showToast("The timer resumed");
    } else {
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
      const formatted = numValue.toString().padStart(2, "0");

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
    if (!isRunning || !targetEndTime) return; // Only work when timer is running

    const millisecondsToAdd = minutesToAdd * 60 * 1000;
    const newTargetEndTime = targetEndTime + millisecondsToAdd;
    const newInitialSeconds = initialSeconds + minutesToAdd * 60;

    setTargetEndTime(newTargetEndTime);
    setInitialSeconds(newInitialSeconds);

    // Immediately update the display
    const now = Date.now();
    const remainingSeconds = Math.max(
      0,
      Math.ceil((newTargetEndTime - now) / 1000),
    );
    setSecondsLeft(remainingSeconds);
    formatTime(remainingSeconds);

    showToast(
      `Added ${minutesToAdd} minute${minutesToAdd > 1 ? "s" : ""} to timer`,
    );
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
      setMode("default");
    } else {
      timerContainer?.requestFullscreen();
      setMode("fullscreen");
    }
  };
  return (
    <div className="timer-container bg-pagebg" id="timer-container">
      <div className="mb-6 flex flex-col items-center gap-4 p-4 md:mb-12">
        <input
          type="text"
          placeholder="Timer title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="timer-title w-full max-w-[800px] rounded-lg border-none bg-transparent px-4 py-2 text-center text-xl font-bold transition-colors duration-300 outline-none focus:bg-gray-100 sm:text-2xl md:text-3xl lg:text-[42px]"
        />
      </div>

      {/* Quick Timer Presets */}
      {!isRunning && (
        <div className="mb-6 flex flex-wrap justify-center gap-2 px-4 sm:gap-3 md:mb-8 md:gap-4 md:px-8">
          <button
            onClick={() => setPresetTime(0, 30)}
            className="border-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:text-white sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg"
          >
            30 mins
          </button>
          <button
            onClick={() => setPresetTime(0, 45)}
            className="border-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:text-white sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg"
          >
            45 mins
          </button>
          <button
            onClick={() => setPresetTime(1, 0)}
            className="border-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:text-white sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg"
          >
            1 hour
          </button>
          <button
            onClick={() => setPresetTime(1, 30)}
            className="border-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:text-white sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg"
          >
            1.5 hours
          </button>
          <button
            onClick={() => setPresetTime(2, 0)}
            className="border-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:text-white sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg"
          >
            2 hours
          </button>
        </div>
      )}

      <div className="timer-content">
        <div className="wc">
          <div className="text-brand-violet flex w-full max-w-[90vw] flex-shrink-0 items-center justify-center gap-1 text-5xl sm:gap-2 sm:text-6xl md:w-[800px] md:text-7xl lg:text-[150px]">
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
                  className="bg-brand-violet h-full rounded-[25px] shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((initialSeconds - secondsLeft) / initialSeconds) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-4 flex justify-center text-lg font-semibold sm:text-xl md:mt-6 md:text-2xl lg:text-[32px]">
                <span className="color-contrast">
                  Time passed:{" "}
                  <strong className="text-brand-violet">
                    {Math.floor((initialSeconds - secondsLeft) / 60)}:
                    {String((initialSeconds - secondsLeft) % 60).padStart(
                      2,
                      "0",
                    )}
                  </strong>
                </span>
              </div>
              <div className="text-brand-violet mt-2 text-center text-2xl font-bold sm:text-3xl md:mt-4 md:text-4xl lg:text-5xl">
                {Math.round(
                  ((initialSeconds - secondsLeft) / initialSeconds) * 100,
                )}
                %
              </div>
            </div>
          )}

          <div className="timer-controls">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="timer-button start-button"
              >
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="timer-button pause-button"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleStop}
                  className="timer-button stop-button"
                >
                  Stop
                </button>
              </>
            )}
            <button
              className={`timer-button ${mode === "fullscreen" ? "stop-button" : "start-button"}`}
              onClick={() => {
                switchFullscreen();
              }}
            >
              {mode === "fullscreen" ? "Exit Full Screen" : "Full Screen"}
            </button>
          </div>

          {/* Add Time Buttons - Show when timer is running */}
          {isRunning && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 px-4 sm:gap-3 md:mt-8">
              <span className="mr-1 w-full self-center text-center text-sm font-semibold text-gray-600 sm:mr-2 sm:w-auto sm:text-base md:text-lg">
                Add time:
              </span>
              <button
                onClick={() => addTimeToRunningTimer(5)}
                className="border-brand-violet text-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:text-white sm:px-4 sm:py-2 sm:text-base md:px-5"
              >
                +5 min
              </button>
              <button
                onClick={() => addTimeToRunningTimer(10)}
                className="border-brand-violet text-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:text-white sm:px-4 sm:py-2 sm:text-base md:px-5"
              >
                +10 min
              </button>
              <button
                onClick={() => addTimeToRunningTimer(15)}
                className="border-brand-violet text-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:text-white sm:px-4 sm:py-2 sm:text-base md:px-5"
              >
                +15 min
              </button>
              <button
                onClick={() => addTimeToRunningTimer(20)}
                className="border-brand-violet text-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:text-white sm:px-4 sm:py-2 sm:text-base md:px-5"
              >
                +20 min
              </button>
              <button
                onClick={() => addTimeToRunningTimer(30)}
                className="border-brand-violet text-brand-violet hover:bg-brand-violet cursor-pointer rounded-lg border-2 bg-white px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:text-white sm:px-4 sm:py-2 sm:text-base md:px-5"
              >
                +30 min
              </button>
            </div>
          )}
        </div>
      </div>

      {showStopDialog && (
        <div
          className="dialog-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStopDialog(false);
            }
          }}
        >
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">Stop Timer</h3>
              <p className="dialog-description">
                Are you sure you want to stop the timer? This action cannot be
                undone.
              </p>
            </div>
            <div className="dialog-footer">
              <button
                onClick={() => setShowStopDialog(false)}
                className="dialog-button dialog-cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                className="dialog-button dialog-confirm"
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
            className="animate-in fade-in zoom-in relative mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 text-center shadow-2xl duration-300 sm:rounded-3xl sm:p-8 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-5xl sm:mb-6 sm:text-6xl md:text-7xl lg:text-8xl">
              ⏰
            </div>
            <h2 className="text-brand-violet mb-3 text-3xl font-bold sm:text-4xl md:mb-4 md:text-5xl lg:text-6xl">
              Time's Up!
            </h2>
            {title && (
              <p className="mb-4 text-lg font-semibold text-gray-700 sm:text-xl md:mb-8 md:text-2xl lg:text-3xl">
                {title}
              </p>
            )}
            <button
              onClick={dismissTimeUpMessage}
              className="border-brand-violet bg-brand-violet mt-2 cursor-pointer rounded-lg border-2 px-6 py-2 text-base font-bold text-white transition-all duration-300 hover:bg-purple-700 hover:shadow-xl sm:px-8 sm:py-3 sm:text-lg md:mt-4 md:rounded-xl md:px-12 md:py-4 md:text-xl lg:text-2xl"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast"
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
