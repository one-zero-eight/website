import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Settings } from "lucide-react";
import "./timerstyles.css";

interface Toast {
  id: number;
  message: string;
}

type TimerShape = "none" | "circle" | "square";

/*
interface TimerSettings {
  isSettingsOpen: boolean;
  timerShape: TimerShape;
  timerSize: number; 
  timerColor: string;
}
*/

function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace(/^#/, "");
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TimerPage = () => {
  const [title, setTitle] = useState<string>("");
  const [time, setTime] = useState<string>("00:00:00");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showStopDialog, setShowStopDialog] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /*
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [timerShape, setTimerShape] = useState<TimerShape>("circle");
  const [timerSize, setTimerSize] = useState<number>(100);
  const [timerColor, setTimerColor] = useState<string>("#9747ff");
  */
  const [isSettingsOpen, setIsSettingsOpen] = useLocalStorage<boolean>(
    "timerSettingsOpen",
    false,
  );
  const [timerShape, setTimerShape] = useLocalStorage<TimerShape>(
    "timerShape",
    "circle",
  );
  const [timerSize, setTimerSize] = useLocalStorage<number>("timerSize", 100);
  const [timerColor, setTimerColor] = useLocalStorage<string>(
    "timerColor",
    "#9747ff",
  );

  const timerRef = useRef<number>();
  const toastIdCounter = useRef(0);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    document.documentElement.style.setProperty("--timer-color", timerColor);
    const glowColor = hexToRgba(timerColor, 0.5);
    document.documentElement.style.setProperty("--timer-glow", glowColor);
  }, [timerColor]);

  // Load panel settings from localStorage
  /* useEffect(() => {
    const savedPanelSettings = localStorage.getItem("timerPanelSettings");
    if (savedPanelSettings) {
      const settings: TimerSettings = JSON.parse(savedPanelSettings);

      // Конвертируем старые значения из rem в проценты
      if (settings.timerSize > 100) {
        // Старый формат rem
        const baseSize = 35; // Стандартный размер в rem
        const newSize = Math.round((settings.timerSize / baseSize) * 100);
        settings.timerSize = Math.min(Math.max(newSize, 50), 300);
      }

      setIsSettingsOpen(settings.isSettingsOpen);
      setTimerShape(settings.timerShape);
      setTimerSize(settings.timerSize);
      setTimerColor(settings.timerColor);
    }
  }, []); */

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setTime("00:00:00");
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    localStorage.removeItem("timerState");
    showToast("Time is up!");
  }, []);

  /*
  useEffect(() => {
    const settings: TimerSettings = {
      isSettingsOpen,
      timerShape,
      timerColor,
      timerSize,
    };
    localStorage.setItem("timerPanelSettings", JSON.stringify(settings));
  }, [isSettingsOpen, timerShape, timerColor, timerSize]);

  useEffect(() => {
    const updatePanelWidth = () => {
      if (settingsPanelRef.current && isSettingsOpen) {
        const width = settingsPanelRef.current.offsetWidth;
      }
    };
    // Обновляем при открытии
    if (isSettingsOpen) {
      // немного отложим, чтобы DOM успел "открыть" панель
      setTimeout(updatePanelWidth, 50);
    }

    window.addEventListener("resize", updatePanelWidth);
    return () => {
      window.removeEventListener("resize", updatePanelWidth);
    };
  }, [isSettingsOpen]);
  */

  useEffect(() => {
    const savedState = localStorage.getItem("timerState");
    if (savedState) {
      const {
        title: savedTitle,
        secondsLeft: savedSeconds,
        isRunning: savedIsRunning,
        isPaused: savedIsPaused,
        lastUpdate,
        timerShape: savedShape,
        timerSize: savedSize,
        timerColor: savedColor = "#9747ff",
      } = JSON.parse(savedState);

      let adjustedSeconds = savedSeconds;
      if (savedIsRunning && !savedIsPaused && lastUpdate) {
        const timePassed = Math.floor((Date.now() - lastUpdate) / 1000);
        adjustedSeconds = Math.max(0, savedSeconds - timePassed);
      }
      setTitle(savedTitle);
      setSecondsLeft(adjustedSeconds);
      setIsRunning(savedIsRunning);
      setIsPaused(savedIsPaused);
      setTimerShape(savedShape || "circle");
      setTimerSize(savedSize || 35);
      formatTime(adjustedSeconds);
      setTimerColor(savedColor);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      lastUpdateRef.current = Date.now();
    } else if (isRunning && !isPaused) {
      const timePassed = Math.floor(
        (Date.now() - lastUpdateRef.current) / 1000,
      );
      setSecondsLeft((prev) => {
        const newValue = Math.max(0, prev - timePassed);
        formatTime(newValue);
        return newValue;
      });
    }
  }, [isRunning, isPaused]);

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

  const saveState = useCallback(
    (seconds: number) => {
      localStorage.setItem(
        "timerState",
        JSON.stringify({
          title,
          secondsLeft: seconds,
          isRunning,
          isPaused,
          lastUpdate: Date.now(),
          timerShape,
          timerColor,
          timerSize,
        }),
      );
    },
    [title, isRunning, isPaused, timerShape, timerColor, timerSize],
  );

  useEffect(() => {
    if (isRunning && !isPaused) {
      lastUpdateRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 0) {
            handleTimerComplete();
            return 0;
          }
          const newValue = prev - 1;
          formatTime(newValue);
          saveState(newValue);
          return newValue;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused, handleTimerComplete, saveState]);

  const formatTime = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      setTime("00:00:00");
      return;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setTime(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    );
  };

  const parseTime = (timeString: string): number => {
    const [hours = "0", minutes = "0", seconds = "0"] = timeString.split(":");
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const s = parseInt(seconds, 10);
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      return 0;
    }

    return h * 3600 + m * 60 + s;
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parts = value.split(":");

    if (parts.length > 3) return;

    const isValid = parts.every((part, index) => {
      const num = parseInt(part, 10);
      if (isNaN(num)) return part === "";
      if (index === 0) return part.length <= 2 && num >= 0;
      return part.length <= 2 && num >= 0 && num < 60;
    });
    if (isValid) {
      setTime(value);
    }
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

  const handleStart = () => {
    if (time === "00:00:00") {
      showToast("Error: set the right time");
      return;
    }
    const seconds = parseTime(time);
    if (seconds > 0) {
      setIsRunning(true);
      setIsPaused(false);
      setSecondsLeft(seconds);
      saveState(seconds);
      showToast("The timer started");
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    saveState(secondsLeft);
    showToast(isPaused ? "The timer resumed" : "The timer stopped");
  };

  const handleStop = () => {
    setShowStopDialog(true);
  };

  const confirmStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTime("00:00:00");
    setSecondsLeft(0);
    setShowStopDialog(false);
    localStorage.removeItem("timerState");
    showToast("The timer stopped");
  };

  // color change changing and check
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(value);

    if (isValidHex) {
      setTimerColor(value);
      saveState(secondsLeft);
    } else {
      showToast("Invalid color format");
    }
  };

  const getTimerClassName = () => {
    const baseClass = "timer-display";
    const runningClass = isRunning && timerShape !== "none" ? "running" : "";
    const shapeClass =
      timerShape === "none"
        ? "no-shape"
        : timerShape === "square"
          ? "square"
          : "";
    return `${baseClass} ${runningClass} ${shapeClass}`;
  };

  const timerStyles = {
    "--timer-scale": timerSize / 100,
    width: `calc(clamp(150px, 40vmin, 80vmin) * ${timerSize / 100})`,
    height:
      timerShape !== "none"
        ? `calc(clamp(150px, 40vmin, 80vmin) * ${timerSize / 100})`
        : "auto",
    fontSize: `calc(clamp(24px, 7vmin, 12vmin) * ${timerSize / 100})`,
    padding: `calc(3vmin * ${timerSize / 100})`,
    borderColor: timerColor,
    color: timerColor,
  } as React.CSSProperties;

  // Ползунок размера, добавлен снеппинг
  const snapTo = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250];

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const snapped = snapTo.reduce((prev, curr) =>
      Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
    );

    setTimerSize(snapped);
    saveState(secondsLeft);
  };

  const handleShapeChange = (shape: TimerShape) => {
    setTimerShape(shape);
    saveState(secondsLeft);
  };

  return (
    <div className="timer-container">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <input
          type="text"
          placeholder="Enter the reason for this cute timer..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isRunning}
          className="timer-title"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",

            width: "2rem",
            display: "flex",
            alignItems: "start",
            justifyContent: "start",
            marginLeft: "0.5rem",
          }}
        >
          <Settings size={20} color="#9747ff" />
        </button>
      </div>

      <div className="timer-content">
        <div className="wc">
          <input
            type="text"
            value={time}
            onChange={handleTimeInput}
            onBlur={handleTimeBlur}
            disabled={isRunning}
            className={getTimerClassName()}
            style={timerStyles}
          />
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
          </div>
        </div>
      </div>
      {isSettingsOpen && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <div className="dialog-header">
              <h3 className="dialog-title">Settings</h3>
            </div>

            <div className="settings-section">
              <h4>Shape</h4>
              <div className="shape-buttons">
                <button
                  className={`shape-button ${timerShape === "none" ? "active" : ""}`}
                  onClick={() => handleShapeChange("none")}
                >
                  None
                </button>
                <button
                  className={`shape-button ${timerShape === "circle" ? "active" : ""}`}
                  onClick={() => handleShapeChange("circle")}
                >
                  Circle
                </button>
                <button
                  className={`shape-button ${timerShape === "square" ? "active" : ""}`}
                  onClick={() => handleShapeChange("square")}
                >
                  Square
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h4>Size</h4>
              <input
                type="range"
                min="50"
                max="250"
                value={timerSize}
                onChange={handleSizeChange}
                className="size-slider"
              />
              <div className="size-value">{timerSize}%</div>
            </div>

            <div className="settings-section">
              <h4>Color</h4>
              <input
                type="color"
                value={timerColor}
                onChange={handleColorChange}
                className="color-slider"
              />
              <div className="size-value" style={{ color: timerColor }}>
                {timerColor.toUpperCase()}
              </div>
            </div>

            <div className="dialog-footer">
              <button
                className="dialog-button dialog-cancel"
                onClick={() => setIsSettingsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showStopDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
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
    </div>
  );
};

export default TimerPage;
