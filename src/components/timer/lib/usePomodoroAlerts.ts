import { useEffect, useRef } from "react";
import { PomodoroMode, POMODORO_MODE_LABELS } from "./usePomodoro";

const SOUND_URL = "/sound_timer.wav";

export function usePomodoroAlerts() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(SOUND_URL);
  }, []);

  // Browsers allow asking for permission only after a user action, so call it from a click handler
  const requestNotificationPermission = () => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    Notification.requestPermission();
  };

  const notifyTimeUp = (nextMode: PomodoroMode) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio
        .play()
        .catch((error) => console.error("Failed to play sound:", error));
    }

    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(`Next: ${POMODORO_MODE_LABELS[nextMode]}`, {
      body: "Press Start when you are ready",
    });
  };

  return { requestNotificationPermission, notifyTimeUp };
}
