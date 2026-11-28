import { AskResponsesGuardrailAnyOf0 } from "@/api/search/types";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

// The faces of the cAtIx mascot: public/catix-cat.svg for `idle`, public/catix-cat-<mood>.svg for the others
export type CatMood =
  | "idle"
  | "thinking"
  | "happy"
  | "writing"
  | "error"
  | "banned";

// What the server says the assistant does (`status` events of POST /ask/stream), or how the guardrail stopped the question
// (`guardrail` event). The words and the face are the site's: the server sends only these codes
export const ASK_STATUSES = {
  checking: { mood: "idle", label: msg`Checking the request` },
  thinking: { mood: "thinking", label: msg`Thinking` },
  searching: { mood: "thinking", label: msg`Searching` },
  reading: { mood: "thinking", label: msg`Reading` },
  working: { mood: "thinking", label: msg`Working on it` },
  preparing_action: { mood: "thinking", label: msg`Preparing the action` },
  writing: { mood: "writing", label: msg`Writing the answer` },
  // The site's own status, not a server code: the page follows the chat's history, not its stream
  still_answering: { mood: "thinking", label: msg`Still answering` },
  blocked: { mood: "banned", label: msg`Request declined` },
  paused: { mood: "banned", label: msg`Access paused` },
} satisfies Record<string, { mood: CatMood; label: MessageDescriptor }>;

export type AskStatus = keyof typeof ASK_STATUSES;

// A code this version of the site does not know (a newer server) is not shown
export function isAskStatus(code: string): code is AskStatus {
  return Object.hasOwn(ASK_STATUSES, code);
}

export function moodOfStatus(status: AskStatus | null): CatMood {
  return status ? ASK_STATUSES[status].mood : "idle";
}

// The face next to a kept answer, when the guardrail had a say in it
export function moodOfGuardrail(
  guardrail: AskResponsesGuardrailAnyOf0 | null | undefined,
): CatMood | undefined {
  if (guardrail === AskResponsesGuardrailAnyOf0.small_talk) return "happy";
  if (guardrail) return "banned";
  return undefined;
}
