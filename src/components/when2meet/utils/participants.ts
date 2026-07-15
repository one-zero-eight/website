import type { accountsTypes } from "@/api/accounts";
import type { when2meetTypes } from "@/api/when2meet";
import type { MeetingUser } from "../types.ts";
import { backendSlotToSlotKey } from "./api-slots.ts";

export function getAccountDisplayName(me?: accountsTypes.SchemaViewUser) {
  const innopolisName = me?.innopolis_info?.name?.trim();

  if (innopolisName) {
    return innopolisName;
  }

  const telegramUsername = me?.telegram_info?.username?.trim();

  if (telegramUsername) {
    return telegramUsername;
  }

  if (me?.id) {
    return me.id;
  }

  return "You";
}

export function getParticipantDisplayName(
  participant: when2meetTypes.SchemaParticipantView,
) {
  if (participant.name) {
    return participant.name;
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

export function getUserDisplaySlots(
  user: MeetingUser,
  editingUserId: string | null,
  draftSlots: Set<string>,
) {
  if (user.id === editingUserId) {
    return draftSlots;
  }

  return user.slots;
}

export function userHasExplicitAvailability(
  user: MeetingUser,
  editingUserId: string | null,
  draftSlots: Set<string>,
) {
  return getUserDisplaySlots(user, editingUserId, draftSlots).size > 0;
}

export function countExplicitSlotAvailability(
  users: MeetingUser[],
  viewedUserIds: Set<string>,
  slotKey: string,
  editingUserId: string | null,
  draftSlots: Set<string>,
) {
  return users.filter((user) => {
    if (!viewedUserIds.has(user.id)) {
      return false;
    }

    const displaySlots = getUserDisplaySlots(user, editingUserId, draftSlots);

    if (displaySlots.size === 0) {
      return false;
    }

    return displaySlots.has(slotKey);
  }).length;
}

export function getParticipantsWithExplicitSlot(
  users: MeetingUser[],
  slotKey: string,
  editingUserId: string | null,
  draftSlots: Set<string>,
) {
  return users.filter((user) => {
    const displaySlots = getUserDisplaySlots(user, editingUserId, draftSlots);

    if (displaySlots.size === 0) {
      return false;
    }

    return displaySlots.has(slotKey);
  });
}

export function sortUsersWithCurrentUserFirst(
  users: MeetingUser[],
  currentUserId?: string | null,
) {
  if (!currentUserId) {
    return users;
  }

  const currentUserIndex = users.findIndex((user) => user.id === currentUserId);

  if (currentUserIndex <= 0) {
    return users;
  }

  const sortedUsers = [...users];
  const [currentUser] = sortedUsers.splice(currentUserIndex, 1);

  return [currentUser, ...sortedUsers];
}
