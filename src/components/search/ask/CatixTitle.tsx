import { CatIcon } from "@/components/icons/CatIcon";
import { startNewChat } from "./ask-session";

// The assistant's name in the page title; a click starts a new chat
export function CatixTitle() {
  return (
    <button
      type="button"
      className="cursor-pointer hover:opacity-80"
      onClick={startNewChat}
    >
      <CatIcon className="inline-block size-[1.25em] align-[-0.2em]" /> catix
    </button>
  );
}
