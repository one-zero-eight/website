export function PomodoroControls({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onReset,
  onSkip,
}: {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {isRunning ? (
        <button
          type="button"
          className="btn btn-primary btn-outline btn-lg sm:btn-xl"
          onClick={onPause}
        >
          <span className="icon-[material-symbols--pause] text-2xl sm:text-3xl" />
          Pause
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-lg sm:btn-xl"
          onClick={onStart}
        >
          <span className="icon-[material-symbols--play-arrow] text-2xl sm:text-3xl" />
          {isPaused ? "Resume" : "Start"}
        </button>
      )}
      {isPaused ? (
        <button
          type="button"
          className="btn btn-outline btn-lg sm:btn-xl"
          onClick={onReset}
        >
          <span className="icon-[material-symbols--replay] text-2xl sm:text-3xl" />
          Reset
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-outline btn-lg sm:btn-xl"
          onClick={onSkip}
        >
          <span className="icon-[material-symbols--skip-next] text-2xl sm:text-3xl" />
          Next
        </button>
      )}
    </div>
  );
}
