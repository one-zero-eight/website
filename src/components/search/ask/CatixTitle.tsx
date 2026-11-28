import { CatIcon } from "@/components/icons/CatIcon";
import { useEffect, useRef, useState } from "react";
import { startNewChat } from "./ask-session";

// How long the pointer rests on the name before the cat says it
const MEOW_DELAY_MS = 1500;

// The assistant's name in the page title; a click starts a new chat, and a pointer that stays on it makes the cat meow
export function CatixTitle() {
  const [isMeowing, setIsMeowing] = useState(false);
  const meowTimer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(meowTimer.current), []);

  const handlePointerEnter = () => {
    meowTimer.current = window.setTimeout(
      () => setIsMeowing(true),
      MEOW_DELAY_MS,
    );
  };

  const handlePointerLeave = () => {
    window.clearTimeout(meowTimer.current);
    setIsMeowing(false);
  };

  return (
    <button
      type="button"
      className="cursor-pointer hover:opacity-80"
      onClick={startNewChat}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <CatIcon
        mood={isMeowing ? "happy" : "idle"}
        className="inline-block size-[1.25em] align-[-0.2em]"
      />{" "}
      {isMeowing ? "MEOW" : "catix"}
    </button>
  );
}
