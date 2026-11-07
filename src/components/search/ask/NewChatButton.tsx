import { Trans } from "@lingui/react/macro";
import { startNewChat, useAskSession } from "./ask-session";

// Starts a new conversation with the assistant; shown once there is one
export function NewChatButton() {
  const { messages, isPending } = useAskSession();
  if (messages.length === 0 && !isPending) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={startNewChat}
    >
      <span className="icon-[material-symbols--add-comment-outline-rounded]" />
      <Trans>New chat</Trans>
    </button>
  );
}
