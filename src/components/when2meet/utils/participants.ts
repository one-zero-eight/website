import type { when2meetTypes } from "@/api/when2meet";
import type { MeetingUser } from "../types.ts";
import { backendSlotToSlotKey } from "./api-slots.ts";

export function getParticipantDisplayName(
  participant: when2meetTypes.SchemaParticipantView,
) {
  const fullName =
    `${participant.first_name ?? ""} ${participant.last_name ?? ""}`.trim();

  if (fullName) {
    return fullName;
  }

  if (participant.email) {
    return participant.email;
  }

  if (participant.telegram) {
    return participant.telegram;
  }

  return participant.user_id;
}

export function participantsToUsers(
  participants: when2meetTypes.SchemaParticipantView[],
): MeetingUser[] {
  return participants.map((participant) => ({
    id: participant.user_id,
    name: getParticipantDisplayName(participant),
    slots: new Set(participant.availability.map(backendSlotToSlotKey)),
  }));
}
