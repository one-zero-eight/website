import {
  useFullscreen,
  useSaveState,
  useWakeLock,
  updateTextAreaHeight,
} from "@/components/timer/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useEventListener } from "usehooks-ts";
import clsx from "clsx";
import { useTimer } from "./lib/useTimer";
import { useTimerRestore } from "./lib/useTimerRestore";
import { useTimerInterval } from "./lib/useTimeInterval";
import { AddTimeButtons } from "./components/AddTimeButtons";
import { TimeUpMessage } from "./components/TimeUpMessage";
import { PresetButtons } from "./components/PresetButtons";
import { TimerInput } from "./components/TimerInput";
import { StopDialog } from "./components/StopDialog";
import CustomTimeModal from "./components/CustomTimeModal";
import { useFullscreenCursor } from "./lib/useFullScreenCursor";
const TimerPage = () => {
  const [title, setTitle] = useState<string>("");
  const [showStopDialog, setShowStopDialog] = useState<boolean>(false);
  const [showTimeUpMessage, setShowTimeUpMessage] = useState<boolean>(false);
  const [showCustomTimeModal, setShowCustomTimeModal] =
    useState<boolean>(false);
  const documentRef = useRef<Document>(document);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const wakeLock = useWakeLock();
  const isFullscreen = useFullscreen();
  const timer = useTimer({ title, setShowStopDialog, setShowTimeUpMessage });
  const {
    hours,
    minutes,
    seconds,
    secondsLeft,
    initialSeconds,
    targetEndTime,
    isRunning,
    isPaused,
  } = timer.state;

  const { hoursRef, minutesRef, secondsRef, audioRef, hasAdjustedTimerRef } =
    timer.refs;

  const {
    setSecondsLeft,
    setInitialSeconds,
    setTargetEndTime,
    setIsRunning,
    setIsPaused,
  } = timer.setters;
  const {
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
  } = timer.handlers;
  const { formatTime } = timer.utils;

  const { saveState } = useSaveState({
    title,
    initialSeconds,
    isRunning,
    isPaused,
    targetEndTime,
  });

  useFullscreenCursor(containerRef, 5000);
  useEffect(() => {
    if (isRunning) {
      saveState(secondsLeft);
    }
  }, [isRunning, isPaused, secondsLeft, saveState]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      wakeLock.request();
    }
  }, [isRunning, isPaused, wakeLock]);

  useEffect(() => {
    return () => {
      wakeLock.release();
    };
  }, [wakeLock]);

  useEventListener(
    "visibilitychange",
    async () => {
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

        wakeLock.request();
      }
    },
    documentRef,
  );

  useEventListener("resize", () => updateTextAreaHeight(titleRef.current));

  useTimerRestore({
    setTitle,
    setInitialSeconds,
    setSecondsLeft,
    setTargetEndTime,
    setIsRunning,
    setIsPaused,
    formatTime,
    handleTimerComplete,
  });
  useTimerInterval({
    isRunning,
    isPaused,
    targetEndTime,
    initialSeconds,
    hasAdjustedTimerRef,
    setTargetEndTime,
    setSecondsLeft,
    formatTime,
    handleTimerComplete,
    saveState,
  });

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    setTimeout(() => {
      input.select();
    }, 0);
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
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative flex grow flex-col items-center p-4 md:p-8",
        isFullscreen && "bg-base-100",
      )}
    >
      <button
        type="button"
        className="btn btn-square btn-lg absolute top-4 right-4 text-2xl"
        onClick={() => switchFullscreen()}
      >
        {isFullscreen ? (
          <span className="icon-[material-symbols--fullscreen-exit]" />
        ) : (
          <span className="icon-[material-symbols--fullscreen]" />
        )}
      </button>
      <div className="mb-6 flex w-full flex-col items-center gap-4 p-4 md:mb-12">
        <textarea
          ref={titleRef}
          placeholder="Timer title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onInput={(e) => updateTextAreaHeight(e.target as HTMLTextAreaElement)}
          rows={1}
          spellCheck={false}
          className="rounded-box w-full max-w-[900px] resize-none overflow-hidden border-none bg-transparent px-6 py-3 text-center text-2xl leading-tight font-bold transition-all duration-300 outline-none placeholder:text-gray-400 focus:bg-gray-100/50 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl dark:focus:bg-gray-900/50"
        />
      </div>

      {/* Quick Timer Presets */}
      <div className="flex w-full max-w-[900px] flex-col items-center gap-4">
        <PresetButtons isRunning={isRunning} onSelectPreset={setPresetTime} />
        {!isRunning && (
          <button
            type="button"
            className="btn btn-outline btn-primary btn-sm sm:btn-md gap-2"
            onClick={() => setShowCustomTimeModal(true)}
          >
            <span className="icon-[material-symbols--calendar-today] text-lg" />
            Until exact time
          </button>
        )}
      </div>

      <div className="flex w-full grow items-center justify-center">
        <div className="wc">
          <div className="text-primary flex w-full max-w-[90vw] shrink-0 items-center justify-center gap-1 text-5xl sm:gap-2 sm:text-6xl md:w-[800px] md:text-7xl lg:text-[150px]">
            <TimerInput
              ref={hoursRef}
              value={hours}
              onChange={(value) => handleSetTime(value, "H")}
              onKeyDown={(e) => handleKeyDown(e, "H")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              type="H"
            />
            <span>:</span>
            <TimerInput
              ref={minutesRef}
              value={minutes}
              onChange={(value) => handleSetTime(value, "M")}
              onKeyDown={(e) => handleKeyDown(e, "M")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              type="M"
            />
            <span>:</span>
            <TimerInput
              ref={secondsRef}
              value={seconds}
              onChange={(value) => handleSetTime(value, "S")}
              onKeyDown={(e) => handleKeyDown(e, "S")}
              onFocus={handleInputFocus}
              onBlur={handleTimeBlur}
              disabled={isRunning}
              type="S"
            />
          </div>

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
              <button
                type="button"
                onClick={handleStart}
                className="btn btn-primary btn-xl"
              >
                <span className="icon-[material-symbols--play-arrow] text-2xl sm:text-3xl" />
                Start
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="btn btn-primary btn-lg sm:btn-xl"
                  >
                    <span className="icon-[material-symbols--play-arrow] text-2xl sm:text-3xl" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="btn btn-primary btn-outline btn-lg sm:btn-xl"
                  >
                    <span className="icon-[material-symbols--pause] text-2xl sm:text-3xl" />
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowStopDialog(true)}
                  className="btn btn-error btn-outline btn-lg sm:btn-xl"
                >
                  <span className="icon-[material-symbols--stop] text-2xl sm:text-3xl" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <StopDialog
        isOpen={showStopDialog}
        onClose={() => setShowStopDialog(false)}
        onConfirm={confirmStop}
      />
      <TimeUpMessage
        isOpen={showTimeUpMessage}
        onDismiss={dismissTimeUpMessage}
      />

      <AddTimeButtons isRunning={isRunning} onAddTime={addTimeToRunningTimer} />

      <CustomTimeModal
        open={showCustomTimeModal}
        onOpenChange={setShowCustomTimeModal}
        onStart={handleStartUntilTime}
      />

      <audio ref={audioRef} src="/sound_timer.wav" preload="auto" loop />
    </div>
  );
};

export default TimerPage;
