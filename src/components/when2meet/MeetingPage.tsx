import { FormEvent, useEffect, useMemo, useState } from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AvailabilitySelector } from "./AvailabilitySelector.tsx";
import { EditEventModal } from "./EditEventModal.tsx";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";
import { RoomSuggestionModal } from "./RoomSuggestionModal.tsx";
import type { MeetingUser } from "./types.ts";
import {
  buildFullDaySlotKeys,
  createBackendSlotLookup,
  getFullDayTimeSlots,
  parseBackendSlots,
  slotKeysToBackendSlots,
} from "./utils/api-slots.ts";
import { getBestMeetingSlotKey } from "./utils/best-slot.ts";
import { participantsToUsers } from "./utils/participants.ts";
import {
  formatDateRangeLabel,
  formatMeetingDates,
  formatSlotSummary,
  getSlotKey,
} from "./utils/slots.ts";
import {
  clearPendingSetup,
  clearStoredAllowedSlots,
  getStoredAllowedSlots,
  isPendingSetup,
  storeAllowedSlots,
} from "./utils/setup-slots.ts";
import {
  getLocalEventRole,
  removeLocalEvent,
  trackParticipation,
  updateLocalEventStats,
} from "./utils/local-events.ts";

const SETUP_USER_ID = "__setup__";

function participantsToUsers(
  participants: { name: string; availability: string[] }[],
) {
  return participants.map((participant) => ({
    id: participant.name,
    name: participant.name,
    slots: new Set(participant.availability.map(backendSlotToSlotKey)),
  }));
}

export function MeetingPage({
  meetingId,
  initialName,
  setupSlots,
}: {
  meetingId: string;
  initialName?: string;
  setupSlots?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showConfirm } = useToast();
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(new Set());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<Set<string>>(new Set());
  const [newUserName, setNewUserName] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
  const [pendingParticipants, setPendingParticipants] = useState<MeetingUser[]>(
    [],
  );
  const [storedAllowedSlotKeys, setStoredAllowedSlotKeys] =
    useState<Set<string> | null>(() => getStoredAllowedSlots(meetingId));

  const configuredAllowedSlots =
    storedAllowedSlotKeys ?? getStoredAllowedSlots(meetingId);

  const needsSetup =
    !configuredAllowedSlots?.size &&
    (setupSlots === true || isPendingSetup(meetingId));

  const {
    data: event,
    isPending,
    isError,
    error,
  } = $when2meet.useQuery("get", "/events/{event_ref}", {
    params: { path: { event_ref: meetingId } },
  });

  const isOwner = !!me?.id && event?.owner_id === me.id;
  const currentUserId = me?.id;

  const needsSetup =
    isOwner && (setupSlots === true || isPendingSetup(meetingId));

  useEffect(() => {
    if (!needsSetup || !event) {
      return;
    }

    setEditingUserId(SETUP_USER_ID);
    setDraftSlots(new Set());
  }, [needsSetup, event]);

  const { mutate: saveParticipant, isPending: isSaving } =
    $when2meet.useMutation("put", "/events/{event_ref}/participants", {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventQueryKey });
        queryClient.invalidateQueries({
          queryKey: $when2meet.queryOptions("get", "/events/participating")
            .queryKey,
        });
      },
      onError: (saveError) => {
        showError("Error", formatApiErrorMessage(saveError));
      },
    });

  const { mutate: deleteParticipant, isPending: isDeletingParticipant } =
    $when2meet.useMutation(
      "delete",
      "/events/{event_ref}/participants/{user_id}",
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: eventQueryKey });
          queryClient.invalidateQueries({
            queryKey: $when2meet.queryOptions("get", "/events/participating")
              .queryKey,
          });
          showSuccess("Participant removed", "Participant was removed.");
        },
        onError: (deleteError) => {
          showError("Error", formatApiErrorMessage(deleteError));
        },
      },
    );

  const { mutate: deleteEvent, isPending: isDeletingMeeting } =
    $when2meet.useMutation("delete", "/events/{event_ref}", {
      onSuccess: () => {
        clearPendingSetup(meetingId);
        queryClient.invalidateQueries({
          queryKey: $when2meet.queryOptions("get", "/events/").queryKey,
        });
        queryClient.removeQueries({ queryKey: eventQueryKey });
        showSuccess("Meeting deleted", `"${meetingName}" was removed.`);
        navigate({ to: "/when2meet" });
      },
      onError: (deleteError) => {
        showError("Error", formatApiErrorMessage(deleteError));
      },
    });

  const { mutate: updateEvent, isPending: isSavingSetup } =
    $when2meet.useMutation("patch", "/events/{event_ref}", {
      onError: (updateError) => {
        showError("Error", formatApiErrorMessage(updateError));
      },
    });

  const parsedSlots = useMemo(
    () => (event ? parseBackendSlots(event.slots) : null),
    [event],
  );

  const backendSlotLookup = useMemo(
    () => (event ? createBackendSlotLookup(event.slots) : new Map()),
    [event],
  );

  const formattedDates = useMemo(
    () => formatMeetingDates(parsedSlots?.dates ?? []),
    [parsedSlots],
  );

  const fullDayTimeSlots = useMemo(() => getFullDayTimeSlots(), []);

  const timeSlots = useMemo(
    () => (needsSetup ? fullDayTimeSlots : (parsedSlots?.timeSlots ?? [])),
    [needsSetup, fullDayTimeSlots, parsedSlots],
  );

  const canvasSlots = useMemo(
    () => new Set(parsedSlots?.slotKeys ?? []),
    [parsedSlots],
  );

  const allowedSlots = useMemo(() => {
    if (needsSetup && parsedSlots) {
      return buildFullDaySlotKeys(parsedSlots.dates);
    }

    return canvasSlots;
  }, [needsSetup, parsedSlots, canvasSlots]);

  const savedUsers = useMemo(
    () => (event ? participantsToUsers(event.participants) : []),
    [event],
  );

  const users = useMemo(() => {
    const savedNames = new Set(savedUsers.map((user) => user.name));
    const unsaved = pendingParticipants.filter(
      (participant) => !savedNames.has(participant.name),
    );
    return [...savedUsers, ...unsaved];
  }, [savedUsers, pendingParticipants]);

  const meetingName = event?.name ?? initialName ?? "Meeting";
  const meetingDescription = event?.description;
  const meetingSlug = event?.slug ?? meetingId;

  const { bestSlotKey, selectedSlotLabel } = useMemo(() => {
    if (formattedDates.length === 0 || timeSlots.length === 0) {
      return { bestSlotKey: null, selectedSlotLabel: "No times yet" };
    }

    let bestSlot = getSlotKey(formattedDates[0].id, timeSlots[0]);
    let bestCount = 0;

    formattedDates.forEach((date) => {
      timeSlots.forEach((time) => {
        const slotKey = getSlotKey(date.id, time);

        if (!allowedSlots.has(slotKey)) {
          return;
        }

        const count = users.filter((user) => user.slots.has(slotKey)).length;

        if (count > bestCount) {
          bestSlot = slotKey;
          bestCount = count;
        }
      });
    });

    const [dateId, time] = bestSlot.split("_");
    const date = formattedDates.find(
      (meetingDate) => meetingDate.id === dateId,
    );

    return {
      bestSlotKey: bestSlot,
      selectedSlotLabel: `${date?.monthDay ?? dateId}, ${time}`,
    };
  }, [formattedDates, timeSlots, users, allowedSlots]);

  const filteredUsers = useMemo(() => {
    const trimmedSearch = participantSearch.trim().toLowerCase();

    if (!trimmedSearch) {
      return users;
    }

    return users.filter((user) =>
      user.name.toLowerCase().includes(trimmedSearch),
    );
  }, [users, participantSearch]);

  function handleStartEditing(userId: string) {
    const user = users.find((entry) => entry.id === userId);

    if (!user) {
      return;
    }

    const user = users.find((entry) => entry.id === userId);

    setEditingUserId(userId);
    setDraftSlots(new Set(user.slots));
  }

  function handleCancelEditing() {
    setEditingUserId(null);
    setDraftSlots(new Set());
  }

  function handleSaveEditing(userId: string) {
    const user = users.find((entry) => entry.id === userId);

    if (!user) {
      return;
    }

    saveParticipant(
      {
        params: { path: { event_ref: meetingId } },
        body: {
          name: user.name,
          availability: slotKeysToBackendSlots(draftSlots, backendSlotLookup),
        },
      },
      {
        onSuccess: () => {
          setPendingParticipants((currentParticipants) =>
            currentParticipants.filter(
              (participant) => participant.name !== user.name,
            ),
          );
          setEditingUserId(null);
          setDraftSlots(new Set());
          trackParticipation({
            id: meetingId,
            name: meetingName,
            description: meetingDescription,
            participantsCount: users.length,
          });
          showSuccess(
            "Availability saved",
            `${user.name}'s timeslots were saved successfully.`,
          );
        },
      },
    );
  }

  function handleApplySlot(
    dateId: string,
    time: string,
    mode: "add" | "remove",
  ) {
    if (!editingUserId) {
      return;
    }

    const slotKey = getSlotKey(dateId, time);

    if (!allowedSlots.has(slotKey)) {
      return;
    }

    setDraftSlots((currentSlots) => {
      const nextSlots = new Set(currentSlots);

      if (mode === "add") {
        nextSlots.add(slotKey);
      } else {
        nextSlots.delete(slotKey);
      }

      return nextSlots;
    });
  }

  function handleToggleViewedUser(userId: string) {
    setViewedUserIds((currentUserIds) => {
      const nextUserIds = new Set(currentUserIds);

      if (nextUserIds.has(userId)) {
        nextUserIds.delete(userId);
      } else {
        nextUserIds.add(userId);
      }

      return nextUserIds;
    });
  }

  function handleDeleteUser(userId: string) {
    const isPending = pendingParticipants.some(
      (participant) => participant.id === userId,
    );

    if (!isPending) {
      showError("Error", "Saved participants cannot be removed yet.");
      return;
    }

    setPendingParticipants((currentParticipants) =>
      currentParticipants.filter((participant) => participant.id !== userId),
    );
    setViewedUserIds((currentUserIds) => {
      const nextUserIds = new Set(currentUserIds);
      nextUserIds.delete(userId);
      return nextUserIds;
    });

    if (editingUserId === userId) {
      handleCancelEditing();
    }

    showSuccess("Participant removed", "Unsaved participant was removed.");
  }

  function handleAddUser(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const trimmedName = newUserName.trim();

    if (!trimmedName) {
      return;
    }

    if (users.some((user) => user.name === trimmedName)) {
      showError("Error", "Participant with this name already exists.");
      return;
    }

    const newUser = {
      id: trimmedName,
      name: trimmedName,
      slots: new Set<string>(),
    };

    setPendingParticipants((currentParticipants) => [
      ...currentParticipants,
      newUser,
    ]);
    setViewedUserIds((currentUserIds) =>
      new Set(currentUserIds).add(newUser.id),
    );
    setNewUserName("");
    setEditingUserId(trimmedName);
    setDraftSlots(new Set());
    showSuccess(
      "Participant added",
      `${trimmedName} was added to the meeting.`,
    );
  }

  function handleSaveSetup() {
    if (draftSlots.size === 0) {
      showError("Error", "Choose at least one timeslot.");
      return;
    }

    const nextAllowedSlots = [...draftSlots];
    storeAllowedSlots(meetingId, nextAllowedSlots);
    clearPendingSetup(meetingId);
    setStoredAllowedSlotKeys(new Set(nextAllowedSlots));
    setEditingUserId(null);
    setDraftSlots(new Set());
    showSuccess(
      "Timeslots saved",
      "Participants can now add their availability.",
    );
  }

  async function handleShareLink() {
    const shareUrl = `${window.location.origin}/when2meet/${meetingSlug}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      showSuccess("Link copied", "Meeting link copied to clipboard.");
    } catch {
      showError("Error", "Could not copy link to clipboard.");
    }
  }

  async function handleDeleteMeeting() {
    const confirmed = await showConfirm({
      title: "Delete meeting",
      message: `Are you sure you want to delete "${meetingName}"? It will be removed from your meetings list.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });

    if (!confirmed) {
      return;
    }

    deleteEvent({
      params: { path: { event_ref: meetingId } },
    });
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton mt-6 h-[420px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
      </RequireAuth>
    );
  }

  if (!event || formattedDates.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="alert alert-error">
          <span>Meeting not found or has no configured dates.</span>
        </div>
      </div>
    );
  }

  const activeViewedUserIds =
    viewedUserIds.size > 0
      ? viewedUserIds
      : new Set(users.map((user) => user.id));

  return (
    <>
      <div className="mx-auto mb-20 grid w-full max-w-[1400px] gap-5 px-4 py-4 md:mb-4">
        <Link
          to="/when2meet"
          className="text-base-content/70 hover:text-base-content inline-flex w-fit items-center gap-1 text-sm font-medium"
        >
          <span className="icon-[material-symbols--arrow-back] text-lg" />
          All meetings
        </Link>

        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold">{meetingName}</h1>
              <button
                type="button"
                className="link link-primary text-sm font-medium"
                onClick={() => setEditOpen(true)}
              >
                Edit event
              </button>
            </div>
            {meetingDescription && (
              <p className="text-base-content/70 mt-2 max-w-3xl text-sm">
                {meetingDescription}
              </p>
            )}
            <div className="text-base-content/70 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>{formatDateRangeLabel(formattedDates)}</span>
              <span>{users.length} responses</span>
              <span>Best time: {selectedSlotLabel}</span>
            </div>
          </div>

          <div className="hidden flex-wrap gap-2 md:flex">
            {needsSetup ? (
              <button
                type="button"
                className="btn btn-primary gap-2"
                onClick={handleSaveSetup}
              >
                Save timeslots
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline gap-2"
                  onClick={handleShareLink}
                >
                  <span className="icon-[material-symbols--share-outline] text-lg" />
                  Share link
                </button>
                <button
                  type="button"
                  className="btn btn-primary gap-2"
                  onClick={() => setRoomsOpen(true)}
                >
                  <span className="icon-[mdi--door-open] text-lg" />
                  Book room
                </button>
                {canDeleteMeeting && (
                  <button
                    type="button"
                    className="btn btn-primary gap-2"
                    disabled={isSavingSetup}
                    onClick={handleSaveSetup}
                  >
                    {isDeletingMeeting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <span className="icon-[material-symbols--delete-outline] text-lg" />
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline gap-2"
                      onClick={handleShareLink}
                    >
                      <span className="icon-[material-symbols--share-outline] text-lg" />
                      Share link
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary gap-2"
                      disabled={!bestSlotKey}
                      onClick={() => setRoomsOpen(true)}
                    >
                      <span className="icon-[mdi--door-open] text-lg" />
                      Book room
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-error btn-square"
                      disabled={isDeletingMeeting}
                      onClick={handleDeleteMeeting}
                    >
                      {isDeletingMeeting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <span className="icon-[material-symbols--delete-outline] text-lg" />
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

        {needsSetup && (
          <div className="alert alert-warning">
            <span>
              Select the timeslots that participants can choose, then click Save
              timeslots.
            </span>
          </div>
        )}

        <section
          className={cn(
            "grid gap-5",
            needsSetup ? "" : "xl:grid-cols-[minmax(0,1fr)_360px]",
          )}
        >
          <div className="bg-base-100 border-base-300 rounded-box min-w-0 border p-3 md:p-5">
            <div className="md:hidden">
              <AvailabilitySelector
                dates={formattedDates}
                timeSlots={timeSlots}
                users={users}
                viewedUserIds={activeViewedUserIds}
                editingUserId={needsSetup ? SETUP_USER_ID : editingUserId}
                draftSlots={draftSlots}
                onApplySlot={handleApplySlot}
                allowedSlots={allowedSlots}
                selectionOnly={needsSetup}
                hideLegend={needsSetup}
                isPhone
              />
            </div>
            <div className="hidden md:block">
              <AvailabilitySelector
                dates={formattedDates}
                timeSlots={timeSlots}
                users={users}
                viewedUserIds={activeViewedUserIds}
                editingUserId={needsSetup ? SETUP_USER_ID : editingUserId}
                draftSlots={draftSlots}
                onApplySlot={handleApplySlot}
                allowedSlots={allowedSlots}
                selectionOnly={needsSetup}
                hideLegend={needsSetup}
              />
            </div>
          </div>

          {!needsSetup && (
            <aside className="grid gap-3">
              <div className="bg-base-100 border-base-300 rounded-box flex flex-col border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Responses</h2>
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() =>
                      setViewedUserIds(new Set(users.map((user) => user.id)))
                    }
                  >
                    View all
                  </button>
                </div>

                <label className="input input-bordered mb-3 w-full rounded-xl focus:outline-none">
                  <span className="icon-[material-symbols--search] text-base-content/50" />
                  <input
                    type="text"
                    className="grow"
                    placeholder="Search participants..."
                    value={participantSearch}
                    onChange={(event) =>
                      setParticipantSearch(event.target.value)
                    }
                  />
                </label>

                <div className="grid max-h-[min(50vh,420px)] gap-2 overflow-y-auto pr-1">
                  {filteredUsers.length === 0 ? (
                    <div className="text-base-content/50 py-6 text-center text-sm">
                      No participants found.
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isViewed = activeViewedUserIds.has(user.id);
                      const isEditing = editingUserId === user.id;

                      return (
                        <div
                          key={user.id}
                          className={cn(
                            "border-base-300 rounded-box grid gap-2 border p-3",
                            isEditing && "border-primary bg-primary/10",
                          )}
                        >
                          <button
                            type="button"
                            className="grid min-w-0 text-left"
                            onClick={() => handleToggleViewedUser(user.id)}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  isViewed ? "bg-primary" : "bg-base-300",
                                )}
                              />
                              <span className="truncate font-medium">
                                {user.name}
                              </span>
                            </span>
                            <span className="text-base-content/60 truncate text-sm">
                              {formatSlotSummary(user.slots, formattedDates)}
                            </span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={cn(
                                "btn grow",
                                isEditing ? "btn-primary" : "btn-outline",
                              )}
                              disabled={isSaving}
                              onClick={() => {
                                if (isEditing) {
                                  handleSaveEditing(user.id);
                                  return;
                                }

                                if (
                                  editingUserId &&
                                  editingUserId !== user.id
                                ) {
                                  handleCancelEditing();
                                }

                                handleStartEditing(user.id);
                              }}
                            >
                              {isEditing && isSaving ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : isEditing ? (
                                "Save timeslots"
                              ) : (
                                "Edit timeslots"
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-error btn-square"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <span className="icon-[material-symbols--delete-outline] text-lg" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <form
                  onSubmit={handleAddUser}
                  className="bg-base-100 border-base-300 rounded-box grid gap-2 border p-3 md:gap-3 md:p-3"
                >
                  <h2 className="text-base font-semibold">Add participant</h2>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Participant name"
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    <span className="icon-[material-symbols--person-add-outline] text-lg" />
                    Add participant
                  </button>
                </form>
              </div>
              <div className="hidden md:block">
                <AvailabilitySelector
                  dates={formattedDates}
                  timeSlots={timeSlots}
                  users={users}
                  viewedUserIds={activeViewedUserIds}
                  editingUserId={needsSetup ? SETUP_USER_ID : editingUserId}
                  draftSlots={draftSlots}
                  onApplySlot={handleApplySlot}
                  allowedSlots={allowedSlots}
                  selectionOnly={needsSetup}
                  hideLegend={needsSetup}
                  hideHint={isEditingSelf || !isOwner}
                />
              </div>
            </div>

      <MeetingMobileBar
        onShare={handleShareLink}
        onBookRoom={() => setRoomsOpen(true)}
        onDelete={
          !needsSetup && canDeleteMeeting ? handleDeleteMeeting : undefined
        }
        isDeleting={isDeletingMeeting}
        onSaveSetup={needsSetup ? handleSaveSetup : undefined}
      />

      <RoomSuggestionModal
        open={roomsOpen}
        onOpenChange={setRoomsOpen}
        slotKey={bestSlotKey}
        meetingName={meetingName}
      />

      <EditEventModal
        open={editOpen}
        onOpenChange={setEditOpen}
        meetingName={meetingName}
        meetingDates={parsedSlots?.dates ?? []}
        description={event.description}
      />
    </>
  );
}
