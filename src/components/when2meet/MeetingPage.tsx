import { FormEvent, useEffect, useMemo, useState } from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AvailabilitySelector } from "./AvailabilitySelector.tsx";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";
import type { AvailabilityType } from "./types.ts";
import {
  backendSlotToSlotKey,
  createBackendSlotLookup,
  parseBackendSlots,
  slotKeysToBackendSlots,
} from "./utils/api-slots.ts";
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
import {
  getStoredParticipantName,
  storeParticipantName,
} from "./utils/participant-identity.ts";

const SETUP_USER_ID = "__setup__";

function participantsToUsers(
  participants: { name: string; availability: string[] }[],
) {
  return participants.map((participant) => ({
    id: participant.name,
    name: participant.name,
    slots: new Set(participant.availability.map(backendSlotToSlotKey)),
    ifNeededSlots: new Set<string>(),
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
  const [draftIfNeededSlots, setDraftIfNeededSlots] = useState<Set<string>>(
    new Set(),
  );
  const [availabilityType, setAvailabilityType] =
    useState<AvailabilityType>("available");
  const [joinName, setJoinName] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [minParticipants, setMinParticipants] = useState(1);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
  const [storedAllowedSlotKeys, setStoredAllowedSlotKeys] =
    useState<Set<string> | null>(() => getStoredAllowedSlots(meetingId));
  const [myName, setMyName] = useState(
    () => getStoredParticipantName(meetingId) ?? "",
  );

  const needsSetup =
    !storedAllowedSlotKeys?.size &&
    !getStoredAllowedSlots(meetingId)?.size &&
    (setupSlots === true || isPendingSetup(meetingId));

  const {
    data: event,
    isPending,
    isError,
    error,
  } = $when2meet.useQuery("get", "/events/{event_id}", {
    params: { path: { event_id: meetingId } },
  });

  useEffect(() => {
    if (!needsSetup || !event) {
      return;
    }

    setEditingUserId(SETUP_USER_ID);
    setDraftSlots(new Set());
    setDraftIfNeededSlots(new Set());
  }, [needsSetup, event]);

  useEffect(() => {
    if (!event?.id) {
      return;
    }

    updateLocalEventStats(event.id, {
      name: event.name,
      description: event.description,
      participantsCount: event.participants.length,
    });
  }, [event?.id, event?.name, event?.description, event?.participants.length]);

  const { mutate: saveParticipant, isPending: isSaving } =
    $when2meet.useMutation("put", "/events/{event_id}/participants", {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $when2meet.queryOptions("get", "/events/{event_id}", {
            params: { path: { event_id: meetingId } },
          }).queryKey,
        });
      },
      onError: (saveError) => {
        showError("Error", formatApiErrorMessage(saveError));
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

  const timeSlots = useMemo(() => parsedSlots?.timeSlots ?? [], [parsedSlots]);
  const canvasSlots = useMemo(
    () => new Set(parsedSlots?.slotKeys ?? []),
    [parsedSlots],
  );

  const allowedSlots = useMemo(() => {
    if (needsSetup) {
      return canvasSlots;
    }

    const stored = storedAllowedSlotKeys ?? getStoredAllowedSlots(meetingId);

    if (stored && stored.size > 0) {
      return stored;
    }

    return canvasSlots;
  }, [needsSetup, canvasSlots, storedAllowedSlotKeys, meetingId]);

  const users = useMemo(
    () => (event ? participantsToUsers(event.participants) : []),
    [event],
  );

  const meetingName = event?.name ?? initialName ?? "Meeting";
  const meetingDescription = event?.description;

  const myUser = useMemo(
    () => users.find((user) => user.name === myName) ?? null,
    [users, myName],
  );

  useEffect(() => {
    if (needsSetup || !myName || !myUser) {
      return;
    }

    setViewedUserIds((current) => new Set(current).add(myUser.id));
  }, [needsSetup, myName, myUser]);

  useEffect(() => {
    if (viewedUserIds.size > 0 || users.length === 0) {
      return;
    }

    setViewedUserIds(new Set(users.map((user) => user.id)));
  }, [users, viewedUserIds.size]);

  const filteredUsers = useMemo(() => {
    const trimmedSearch = participantSearch.trim().toLowerCase();

    if (!trimmedSearch) {
      return users;
    }

    return users.filter((user) =>
      user.name.toLowerCase().includes(trimmedSearch),
    );
  }, [users, participantSearch]);

  const maxMinParticipants = Math.max(1, users.length);

  useEffect(() => {
    if (minParticipants > maxMinParticipants) {
      setMinParticipants(maxMinParticipants);
    }
  }, [maxMinParticipants, minParticipants]);

  function handleStartEditing(userId: string) {
    const user = users.find((entry) => entry.id === userId);

    if (!user) {
      setEditingUserId(userId);
      setDraftSlots(new Set());
      setDraftIfNeededSlots(new Set());
      setAvailabilityType("available");
      return;
    }

    setEditingUserId(userId);
    setDraftSlots(new Set(user.slots));
    setDraftIfNeededSlots(new Set(user.ifNeededSlots ?? []));
    setAvailabilityType("available");
  }

  function handleCancelEditing() {
    setEditingUserId(null);
    setDraftSlots(new Set());
    setDraftIfNeededSlots(new Set());
  }

  function handleSaveEditing(userId: string) {
    const userName = users.find((entry) => entry.id === userId)?.name ?? userId;

    saveParticipant(
      {
        params: { path: { event_id: meetingId } },
        body: {
          name: userName,
          availability: slotKeysToBackendSlots(draftSlots, backendSlotLookup),
        },
      },
      {
        onSuccess: () => {
          setEditingUserId(null);
          setDraftSlots(new Set());
          setDraftIfNeededSlots(new Set());
          trackParticipation({
            id: meetingId,
            name: meetingName,
            description: meetingDescription,
            participantsCount: users.length + (myUser ? 0 : 1),
          });
          showSuccess(
            "Availability saved",
            "Your times were saved successfully.",
          );
        },
      },
    );
  }

  function handleApplySlot(
    dateId: string,
    time: string,
    mode: "add" | "remove",
    _type: AvailabilityType,
  ) {
    if (!editingUserId) {
      return;
    }

    const slotKey = getSlotKey(dateId, time);

    setDraftSlots((currentSlots) => {
      const nextSlots = new Set(currentSlots);

      if (mode === "add") {
        nextSlots.add(slotKey);
      } else {
        nextSlots.delete(slotKey);
      }

      return nextSlots;
    });

    // if_needed support is disabled for now
    // const setter = type === "if_needed" ? setDraftIfNeededSlots : setDraftSlots;
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

  function handleJoin(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const trimmedName = joinName.trim();

    if (!trimmedName) {
      return;
    }

    storeParticipantName(meetingId, trimmedName);
    setMyName(trimmedName);
    setJoinName("");
    handleStartEditing(trimmedName);
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
    setDraftIfNeededSlots(new Set());
    showSuccess(
      "Timeslots saved",
      "Share the link so participants can add their availability.",
    );
    navigate({
      to: "/when2meet/$meetingId",
      params: { meetingId },
      search: { name: initialName },
    });
  }

  const canDeleteMeeting = getLocalEventRole(meetingId) !== "participant";

  async function handleShareLink() {
    const shareUrl = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      showSuccess(
        "Link copied",
        "Share this link so others can add their time.",
      );
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

    setIsDeletingMeeting(true);
    removeLocalEvent(meetingId);
    clearStoredAllowedSlots(meetingId);
    clearPendingSetup(meetingId);
    queryClient.removeQueries({
      queryKey: $when2meet.queryOptions("get", "/events/{event_id}", {
        params: { path: { event_id: meetingId } },
      }).queryKey,
    });
    showSuccess("Meeting deleted", `"${meetingName}" was removed.`);
    navigate({ to: "/when2meet" });
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-6 h-[360px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
      </div>
    );
  }

  if (!event || formattedDates.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
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

  const isEditingSelf = editingUserId === myName;
  const showJoinForm = !needsSetup && !myName && !editingUserId;
  const showContinueAs =
    !needsSetup && myName && !myUser && !isEditingSelf && !editingUserId;
  const showMyAvailability = !needsSetup && myName && myUser && !isEditingSelf;

  return (
    <>
      <div className="mx-auto mb-20 grid w-full max-w-[1200px] gap-4 px-4 py-4 md:mb-4">
        <Link
          to="/when2meet"
          className="text-base-content/70 hover:text-base-content inline-flex w-fit items-center gap-1 text-sm"
        >
          <span className="icon-[material-symbols--arrow-back]" />
          All meetings
        </Link>

        <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold">{meetingName}</h1>
              <Link
                to="/when2meet/$meetingId/details"
                params={{ meetingId }}
                search={{ name: meetingName }}
                className="link link-primary text-sm"
              >
                Details
              </Link>
            </div>
            {meetingDescription && (
              <p className="text-base-content/70 mt-1 max-w-2xl text-sm">
                {meetingDescription}
              </p>
            )}
            <div className="text-base-content/70 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span>{formatDateRangeLabel(formattedDates)}</span>
              <span>{users.length} responses</span>
            </div>
          </div>

          <div className="hidden flex-wrap gap-2 md:flex">
            {needsSetup ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSetup}
              >
                Save timeslots
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleShareLink}
                >
                  Share link
                </button>
                <Link
                  to="/when2meet/$meetingId/book-room"
                  params={{ meetingId }}
                  search={{ name: meetingName }}
                  className="btn btn-primary"
                >
                  Book room
                </Link>
                {canDeleteMeeting && (
                  <button
                    type="button"
                    className="btn btn-outline btn-error btn-square"
                    disabled={isDeletingMeeting}
                    onClick={handleDeleteMeeting}
                  >
                    {isDeletingMeeting ? (
                      <span className="loading loading-spinner" />
                    ) : (
                      <span className="icon-[material-symbols--delete-outline] text-xl" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {needsSetup && (
          <div className="alert alert-warning text-sm">
            <span>
              Select the timeslots that participants can choose, then save.
            </span>
          </div>
        )}

        {!needsSetup && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-base-content/70">
                Show slots with at least
              </span>
              <input
                type="number"
                className="input input-bordered w-16"
                min={1}
                max={maxMinParticipants}
                value={minParticipants}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  if (Number.isNaN(value)) {
                    return;
                  }

                  setMinParticipants(
                    Math.min(maxMinParticipants, Math.max(1, value)),
                  );
                }}
              />
              <span className="text-base-content/70">people</span>
            </label>
          </div>
        )}

        {showJoinForm && (
          <form
            onSubmit={handleJoin}
            className="bg-base-100 border-base-300 rounded-box border p-4"
          >
            <h2 className="mb-1 text-sm font-medium">Add your availability</h2>
            <p className="text-base-content/60 mb-3 text-sm">
              Enter your name, then mark when you are free on the grid below.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                className="input input-bordered w-full sm:max-w-xs"
                placeholder="Your name"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {showContinueAs && (
          <div className="bg-base-100 border-base-300 rounded-box flex flex-wrap items-center justify-between gap-3 border p-4 text-sm">
            <span>
              Continue as <span className="font-medium">{myName}</span>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleStartEditing(myName)}
            >
              Mark availability
            </button>
          </div>
        )}

        {showMyAvailability && (
          <div className="bg-base-100 border-base-300 rounded-box flex flex-wrap items-center justify-between gap-3 border p-4 text-sm">
            <div>
              <span className="font-medium">{myName}</span>
              <span className="text-base-content/60">
                {" "}
                —{" "}
                {formatSlotSummary(myUser?.slots ?? new Set(), formattedDates)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleStartEditing(myName)}
            >
              Edit my times
            </button>
          </div>
        )}

        {isEditingSelf && myName && (
          <div className="bg-primary/5 border-primary/30 rounded-box flex flex-wrap items-center justify-between gap-3 border p-4 text-sm">
            <span>
              Editing availability for{" "}
              <span className="font-medium">{myName}</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancelEditing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={() => handleSaveEditing(myName)}
              >
                {isSaving ? (
                  <span className="loading loading-spinner" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        )}

        <section
          className={cn(
            "grid gap-4",
            needsSetup ? "" : "xl:grid-cols-[minmax(0,1fr)_280px]",
          )}
        >
          <div className="bg-base-100 border-base-300 rounded-box min-w-0 border p-3 md:p-4">
            <div className="md:hidden">
              <AvailabilitySelector
                dates={formattedDates}
                timeSlots={timeSlots}
                users={users}
                viewedUserIds={activeViewedUserIds}
                editingUserId={needsSetup ? SETUP_USER_ID : editingUserId}
                draftSlots={draftSlots}
                draftIfNeededSlots={draftIfNeededSlots}
                onApplySlot={handleApplySlot}
                onAvailabilityTypeChange={setAvailabilityType}
                availabilityType={availabilityType}
                allowedSlots={allowedSlots}
                selectionOnly={needsSetup}
                hideLegend={needsSetup}
                minParticipants={needsSetup ? 0 : minParticipants}
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
                draftIfNeededSlots={draftIfNeededSlots}
                onApplySlot={handleApplySlot}
                onAvailabilityTypeChange={setAvailabilityType}
                availabilityType={availabilityType}
                allowedSlots={allowedSlots}
                selectionOnly={needsSetup}
                hideLegend={needsSetup}
                minParticipants={needsSetup ? 0 : minParticipants}
              />
            </div>
          </div>

          {!needsSetup && (
            <aside className="bg-base-100 border-base-300 rounded-box border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Responses</h2>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setViewedUserIds(new Set(users.map((user) => user.id)))
                  }
                >
                  Show all
                </button>
              </div>

              <label className="input input-bordered mb-3 w-full text-sm focus:outline-none">
                <span className="icon-[material-symbols--search] text-base-content/50" />
                <input
                  type="text"
                  className="grow"
                  placeholder="Search..."
                  value={participantSearch}
                  onChange={(event) => setParticipantSearch(event.target.value)}
                />
              </label>

              <div className="grid max-h-[min(50vh,400px)] gap-1 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-base-content/50 py-6 text-center text-sm">
                    No responses yet. Share the link to collect availability.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isViewed = activeViewedUserIds.has(user.id);
                    const isMe = user.name === myName;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        className={cn(
                          "hover:bg-base-200 flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm",
                          isMe && "bg-primary/5",
                        )}
                        onClick={() => handleToggleViewedUser(user.id)}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            isViewed ? "bg-primary" : "bg-base-300",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium">
                              {user.name}
                            </span>
                            {isMe && (
                              <span className="badge badge-primary badge-xs">
                                you
                              </span>
                            )}
                          </span>
                          <span className="text-base-content/60 block truncate">
                            {formatSlotSummary(user.slots, formattedDates)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          )}
        </section>
      </div>

      <MeetingMobileBar
        onShare={handleShareLink}
        meetingId={meetingId}
        meetingName={meetingName}
        onDelete={
          !needsSetup && canDeleteMeeting ? handleDeleteMeeting : undefined
        }
        isDeleting={isDeletingMeeting}
        onSaveSetup={needsSetup ? handleSaveSetup : undefined}
      />
    </>
  );
}
