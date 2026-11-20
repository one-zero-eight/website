import { startNewChat } from "./ask-session";

// The assistant's name in the page title; a click starts a new chat
export function CatixTitle() {
  return (
    <button
      type="button"
      className="cursor-pointer hover:opacity-80"
      onClick={startNewChat}
    >
      🐱 catix
    </button>
  );
}
