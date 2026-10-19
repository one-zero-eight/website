import { useToast } from "@/components/toast";
import { useEffect, useRef } from "react";
import { PomodoroMode, POMODORO_MODE_LABELS } from "./usePomodoro";

const SOUND_URL = "/sound_timer.wav";

export function usePomodoroAlerts() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showInfo } = useToast();

  useEffect(() => {
    audioRef.current = new Audio(SOUND_URL);
  }, []);

  const notifyTimeUp = (nextMode: PomodoroMode) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio
        .play()
        .catch((error) => console.error("Failed to play sound:", error));
    }

    showInfo("Time is up!", `Next: ${POMODORO_MODE_LABELS[nextMode]}`);
  };

  return { notifyTimeUp };
}
