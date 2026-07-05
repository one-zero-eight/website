import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import type {
  Booking,
  Slot,
} from "@/components/room-booking/timeline/types.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvailabilitySelector } from "./AvailabilitySelector.tsx";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";
import { useWhen2MeetPersonalCalendarOverlay } from "./useWhen2MeetPersonalCalendarOverlay.ts";
import { useWhen2MeetRoomBookings } from "./useWhen2MeetRoomBookings.ts";
import {
  buildFullDaySlotKeys,
  collapseHalfHourSlotKeysToHourly,
  createBackendSlotLookup,
  expandHourlySlotKeysToHalfHour,
  getFullDayTimeSlots,
  parseBackendSlots,
  slotKeysToBackendSlots,
} from "./utils/api-slots.ts";
import { getCalendarConflictSlotKeys } from "./utils/calendar-overlay.ts";
import { getIntersectionAtMinParticipants } from "./utils/best-slot.ts";
import {
  clearMeetingRoomBooking,
  isStoredMeetingRoomBookingActive,
  loadMeetingRoomBooking,
  saveMeetingRoomBooking,
  type MeetingRoomBooking,
} from "./utils/meeting-room-booking.ts";
import {
  getAvailableRoomsForSlotKeys,
  getSlotKeysRange,
} from "./utils/room-booking-utils.ts";
import {
  getParticipantsWithExplicitSlot,
  getUserDisplaySlots,
  participantsToUsers,
  sortUsersWithCurrentUserFirst,
  getAccountDisplayName,
} from "./utils/participants.ts";
import {
  formatDateRangeLabel,
  formatMeetingDates,
  formatSlotKeyLabel,
  parseSlotKey,
} from "./utils/slots.ts";
import {
  clearPendingSetup,
  consumeSetupSlotPrefill,
  isPendingSetup,
} from "./utils/setup-slots.ts";
import type { MeetingUser } from "./types.ts";

const SETUP_USER_ID = "__setup__";

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
  const { me } = useMe();
  const { showSuccess, showError, showConfirm } = useToast();
  const [viewedUserIds, setViewedUserIds] = useState<Set<string> | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<Set<string>>(new Set());
  const [participantSearch, setParticipantSearch] = useState("");
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [roomBooking, setRoomBooking] = useState<MeetingRoomBooking | null>(
    () => loadMeetingRoomBooking(meetingId),
  );
  const [minParticipants, setMinParticipants] = useState(1);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<Set<string>>(new Set());
  const [bookingSelectionKeys, setBookingSelectionKeys] = useState<string[]>(
    [],
  );
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [pendingBookingOpen, setPendingBookingOpen] = useState(false);
  const [selectedBookingRoomId, setSelectedBookingRoomId] = useState<
    string | null
  >(null);
  const hasAutoStartedEditingRef = useRef(false);
  const hasInitializedSetupRef = useRef(false);

  const eventQueryKey = $when2meet.queryOptions("get", "/events/{event_ref}", {
    params: { path: { event_ref: meetingId } },
  }).queryKey;

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

  const { mutate: saveParticipant, isPending: isSaving } =
    $when2meet.useMutation("put", "/events/{event_ref}/participants", {
      onSuccess: (updatedEvent) => {
        queryClient.setQueryData(eventQueryKey, updatedEvent);
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
        onSuccess: (updatedEvent) => {
          queryClient.setQueryData(eventQueryKey, updatedEvent);
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
        clearMeetingRoomBooking(meetingSlug);
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
      onSuccess: (updatedEvent) => {
        queryClient.setQueryData(eventQueryKey, updatedEvent);
      },
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

  useEffect(() => {
    if (!needsSetup) {
      hasInitializedSetupRef.current = false;
      return;
    }

    if (!event || !parsedSlots || hasInitializedSetupRef.current) {
      return;
    }

    hasInitializedSetupRef.current = true;
    setEditingUserId(SETUP_USER_ID);

    const fullDayKeys = buildFullDaySlotKeys(parsedSlots.dates);
    let prefillKeys = consumeSetupSlotPrefill(event.slug ?? meetingId);

    if (prefillKeys.length === 0 && event.specific_time) {
      const currentSlotKeys = [
        ...collapseHalfHourSlotKeysToHourly(parsedSlots.slotKeys),
      ].filter((slotKey) => fullDayKeys.has(slotKey));

      if (
        currentSlotKeys.length > 0 &&
        currentSlotKeys.length < fullDayKeys.size
      ) {
        prefillKeys = currentSlotKeys;
      }
    }

    if (prefillKeys.length === 0) {
      setDraftSlots(new Set());
      return;
    }

    setDraftSlots(
      new Set(
        [...collapseHalfHourSlotKeysToHourly(prefillKeys)].filter((slotKey) =>
          fullDayKeys.has(slotKey),
        ),
      ),
    );
  }, [needsSetup, event, parsedSlots, meetingId]);

  const users = useMemo(
    () =>
      event
        ? sortUsersWithCurrentUserFirst(
            participantsToUsers(event.participants),
            currentUserId,
          )
        : [],
    [event, currentUserId],
  );

  const meetingName = event?.name ?? initialName ?? "Meeting";
  const meetingDescription = event?.description;
  const meetingSlug = event?.slug ?? meetingId;

  useEffect(() => {
    setRoomBooking(loadMeetingRoomBooking(meetingSlug));
  }, [meetingSlug]);

  const { data: storedBookingLookup, isSuccess: isStoredBookingLookupSuccess } =
    $roomBooking.useQuery(
      "get",
      "/bookings/",
      {
        params: {
          query: {
            start: roomBooking?.start ?? "",
            end: roomBooking?.end ?? "",
            room_ids: roomBooking ? [roomBooking.roomId] : [],
          },
        },
      },
      {
        enabled: !!roomBooking && !needsSetup,
      },
    );

  useEffect(() => {
    if (!roomBooking || !isStoredBookingLookupSuccess) {
      return;
    }

    if (
      isStoredMeetingRoomBookingActive(roomBooking, storedBookingLookup ?? [])
    ) {
      return;
    }

    clearMeetingRoomBooking(meetingSlug);
    setRoomBooking(null);
  }, [
    roomBooking,
    storedBookingLookup,
    isStoredBookingLookupSuccess,
    meetingSlug,
  ]);

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId),
    [users, currentUserId],
  );

  const listUsers = useMemo(() => {
    if (!currentUserId || currentUser) {
      return users;
    }

    const draftUser: MeetingUser = {
      id: currentUserId,
      name: getAccountDisplayName(me),
      slots: new Set(),
    };

    return [draftUser, ...users];
  }, [users, currentUserId, currentUser, me]);

  const bookedSlotLabel = useMemo(() => {
    if (!roomBooking) {
      return null;
    }

    return formatSlotKeyLabel(roomBooking.slotKey, formattedDates);
  }, [roomBooking, formattedDates]);

  const activeViewedUserIds = useMemo(
    () =>
      viewedUserIds === null
        ? new Set(listUsers.map((user) => user.id))
        : viewedUserIds,
    [viewedUserIds, listUsers],
  );

  const allParticipantIds = useMemo(
    () => new Set(listUsers.map((user) => user.id)),
    [listUsers],
  );

  const slotAvailability = useMemo(() => {
    if (needsSetup || !parsedSlots) {
      return { slotKeys: new Set<string>(), maxCount: 0 };
    }

    return getIntersectionAtMinParticipants(
      listUsers,
      parsedSlots.dates,
      timeSlots,
      allowedSlots,
      allParticipantIds,
      minParticipants,
      editingUserId,
      draftSlots,
    );
  }, [
    needsSetup,
    parsedSlots,
    listUsers,
    timeSlots,
    allowedSlots,
    allParticipantIds,
    minParticipants,
    editingUserId,
    draftSlots,
  ]);

  const highlightBestIntersection =
    minParticipants > 1 && !needsSetup && slotAvailability.slotKeys.size > 0;

  const meetingDateIds = useMemo(() => parsedSlots?.dates ?? [], [parsedSlots]);

  const isEditingSelf = editingUserId === currentUserId;

  const { slotEvents: calendarSlotEvents, hasCalendarData } =
    useWhen2MeetPersonalCalendarOverlay({
      dateIds: meetingDateIds,
      timeSlots,
      allowedSlots,
      enabled: (isEditingSelf || needsSetup) && formattedDates.length > 0,
    });

  const showCalendarOverlay = (isEditingSelf || needsSetup) && hasCalendarData;

  const calendarConflictSlotKeys = useMemo(() => {
    if (!showCalendarOverlay) {
      return new Set<string>();
    }

    return getCalendarConflictSlotKeys(draftSlots, calendarSlotEvents);
  }, [showCalendarOverlay, draftSlots, calendarSlotEvents]);

  const bookingRange = useMemo(
    () => getSlotKeysRange(bookingSelectionKeys),
    [bookingSelectionKeys],
  );

  const { data: myAccessList } = $roomBooking.useQuery(
    "get",
    "/rooms/my-access-list",
    {},
    { enabled: isOwner && !needsSetup },
  );

  const { data: rooms, isPending: isRoomsPending } = $roomBooking.useQuery(
    "get",
    "/rooms/",
    { params: { query: { include_red: true } } },
    { enabled: isOwner && !needsSetup },
  );

  const bookableRooms = useMemo(() => {
    const myAccessListRoomIds = myAccessList?.map((room) => room.id) ?? [];

    return (
      rooms?.filter(
        (room) =>
          room.access_level === RoomAccess_levelAnyOf0.yellow ||
          (room.access_level === RoomAccess_levelAnyOf0.red &&
            me?.innopolis_info?.is_staff) ||
          myAccessListRoomIds.includes(room.id),
      ) ?? []
    );
  }, [rooms, me?.innopolis_info?.is_staff, myAccessList]);

  const { bookings, isPending: isBookingsPending } = useWhen2MeetRoomBookings({
    bookableRooms,
    start: bookingRange?.start.toISOString(),
    end: bookingRange?.end.toISOString(),
    enabled:
      (bookingModalOpen || pendingBookingOpen) &&
      !!bookingRange &&
      bookableRooms.length > 0 &&
      isOwner &&
      !needsSetup,
  });

  const availableBookingRooms = useMemo(() => {
    if (bookingSelectionKeys.length === 0) {
      return [];
    }

    return getAvailableRoomsForSlotKeys(
      bookingSelectionKeys,
      bookings ?? [],
      bookableRooms,
    ).sort((leftRoom, rightRoom) =>
      leftRoom.title.localeCompare(rightRoom.title, undefined, {
        numeric: true,
      }),
    );
  }, [bookingSelectionKeys, bookings, bookableRooms]);

  const bookingNewSlot = useMemo((): Slot | undefined => {
    if (!bookingRange || !bookingModalOpen) {
      return undefined;
    }

    const room =
      availableBookingRooms.find(
        (bookableRoom) => bookableRoom.id === selectedBookingRoomId,
      ) ??
      availableBookingRooms[0] ??
      bookableRooms[0];

    if (!room) {
      return undefined;
    }

    return {
      room: { ...room, idx: 0 },
      start: bookingRange.start,
      end: bookingRange.end,
    };
  }, [
    bookingRange,
    bookingModalOpen,
    availableBookingRooms,
    selectedBookingRoomId,
    bookableRooms,
  ]);

  useEffect(() => {
    if (!pendingBookingOpen || bookingSelectionKeys.length === 0) {
      return;
    }

    if (isBookingsPending || isRoomsPending) {
      return;
    }

    setPendingBookingOpen(false);
    setBookingModalOpen(true);
  }, [
    pendingBookingOpen,
    bookingSelectionKeys.length,
    isBookingsPending,
    isRoomsPending,
  ]);

  useEffect(() => {
    if (!bookingModalOpen || availableBookingRooms.length === 0) {
      return;
    }

    if (
      selectedBookingRoomId &&
      availableBookingRooms.some((room) => room.id === selectedBookingRoomId)
    ) {
      return;
    }

    setSelectedBookingRoomId(availableBookingRooms[0]?.id ?? null);
  }, [bookingModalOpen, availableBookingRooms, selectedBookingRoomId]);

  useEffect(() => {
    if (slotAvailability.maxCount === 0) {
      return;
    }

    if (minParticipants < 1) {
      setMinParticipants(1);
      return;
    }

    if (minParticipants > slotAvailability.maxCount) {
      setMinParticipants(slotAvailability.maxCount);
    }
  }, [slotAvailability.maxCount, minParticipants]);

  const filteredUsers = useMemo(() => {
    const trimmedSearch = participantSearch.trim().toLowerCase();

    if (!trimmedSearch) {
      return listUsers;
    }

    return listUsers.filter((user) =>
      user.name.toLowerCase().includes(trimmedSearch),
    );
  }, [listUsers, participantSearch]);

  const hoveredSlotLabel = useMemo(() => {
    if (!hoveredSlotKey) {
      return "";
    }

    const { dateId, time } = parseSlotKey(hoveredSlotKey);
    const date = formattedDates.find(
      (meetingDate) => meetingDate.id === dateId,
    );

    return `${date?.monthDay ?? dateId}, ${time}`;
  }, [hoveredSlotKey, formattedDates]);

  const hoveredSlotParticipants = useMemo(() => {
    if (!hoveredSlotKey) {
      return [];
    }

    return getParticipantsWithExplicitSlot(
      listUsers,
      hoveredSlotKey,
      editingUserId,
      draftSlots,
    );
  }, [hoveredSlotKey, listUsers, editingUserId, draftSlots]);

  const isHoveredSlotDisabled = useMemo(() => {
    if (!hoveredSlotKey) {
      return false;
    }

    return !allowedSlots.has(hoveredSlotKey);
  }, [hoveredSlotKey, allowedSlots]);

  const isHoveringSlot =
    hoveredSlotKey !== null && editingUserId === null && !needsSetup;

  const isHoveringCalendarSlot =
    isEditingSelf && hoveredSlotKey !== null && showCalendarOverlay;

  const isHoveringAllowedSlot = isHoveringSlot && !isHoveredSlotDisabled;

  const hoveredCalendarEvents = useMemo(() => {
    if (!hoveredSlotKey || !showCalendarOverlay) {
      return [];
    }

    return calendarSlotEvents.get(hoveredSlotKey) ?? [];
  }, [hoveredSlotKey, showCalendarOverlay, calendarSlotEvents]);

  function userHasHoveredSlot(user: MeetingUser) {
    if (!hoveredSlotKey) {
      return false;
    }

    const displaySlots = getUserDisplaySlots(user, editingUserId, draftSlots);

    if (displaySlots.size === 0) {
      return false;
    }

    return displaySlots.has(hoveredSlotKey);
  }

  useEffect(() => {
    if (needsSetup) {
      setHoveredSlotKey(null);
    }
  }, [needsSetup]);

  useEffect(() => {
    if (!highlightBestIntersection || !hoveredSlotKey) {
      return;
    }

    if (!allowedSlots.has(hoveredSlotKey)) {
      return;
    }

    if (slotAvailability.slotKeys.has(hoveredSlotKey)) {
      return;
    }

    setHoveredSlotKey(null);
  }, [
    highlightBestIntersection,
    hoveredSlotKey,
    slotAvailability.slotKeys,
    allowedSlots,
  ]);

  function handleStartEditing(userId: string) {
    if (userId !== currentUserId) {
      return;
    }

    setHoveredSlotKey(null);
    const user = listUsers.find((entry) => entry.id === userId);

    setEditingUserId(userId);
    setDraftSlots(new Set(user?.slots ?? []));
  }

  function handleCancelEditing() {
    setEditingUserId(null);
    setDraftSlots(new Set());
  }

  useEffect(() => {
    if (
      !currentUserId ||
      !event ||
      needsSetup ||
      currentUser ||
      hasAutoStartedEditingRef.current
    ) {
      return;
    }

    hasAutoStartedEditingRef.current = true;
    setEditingUserId(currentUserId);
    setDraftSlots(new Set());
  }, [currentUser, currentUserId, event, needsSetup]);

  function handleClearAllSlots() {
    if (editingUserId !== currentUserId) {
      return;
    }

    setDraftSlots(new Set());
  }

  function handleSaveEditing() {
    if (!currentUserId || editingUserId !== currentUserId) {
      return;
    }

    saveParticipant(
      {
        params: { path: { event_ref: meetingId } },
        body: {
          availability: slotKeysToBackendSlots(draftSlots, backendSlotLookup),
        },
      },
      {
        onSuccess: () => {
          setEditingUserId(null);
          setDraftSlots(new Set());
          showSuccess(
            "Availability saved",
            "Your timeslots were saved successfully.",
          );
        },
      },
    );
  }

  function handleToggleAvailability() {
    if (!currentUserId) {
      return;
    }

    if (editingUserId === currentUserId) {
      handleSaveEditing();
      return;
    }

    if (editingUserId && editingUserId !== currentUserId) {
      handleCancelEditing();
    }

    handleStartEditing(currentUserId);
  }

  function handleApplySlots(slotKeys: string[], mode: "add" | "remove") {
    if (!editingUserId || slotKeys.length === 0) {
      return;
    }

    setDraftSlots((currentSlots) => {
      const nextSlots = new Set(currentSlots);

      for (const slotKey of slotKeys) {
        if (!allowedSlots.has(slotKey)) {
          continue;
        }

        if (mode === "add") {
          nextSlots.add(slotKey);
        } else {
          nextSlots.delete(slotKey);
        }
      }

      return nextSlots;
    });
  }

  function handleToggleViewedUser(userId: string) {
    setViewedUserIds((currentUserIds) => {
      const activeIds =
        currentUserIds === null
          ? new Set(listUsers.map((user) => user.id))
          : new Set(currentUserIds);

      if (activeIds.has(userId)) {
        activeIds.delete(userId);
      } else {
        activeIds.add(userId);
      }

      if (
        listUsers.length > 0 &&
        listUsers.every((user) => activeIds.has(user.id))
      ) {
        return null;
      }

      return activeIds;
    });
  }

  function handleToggleViewAllUsers() {
    const viewedIds =
      viewedUserIds === null
        ? new Set(listUsers.map((user) => user.id))
        : viewedUserIds;
    const allViewed =
      listUsers.length > 0 && listUsers.every((user) => viewedIds.has(user.id));

    if (allViewed) {
      setViewedUserIds(new Set());
      return;
    }

    setViewedUserIds(null);
  }

  function handleDeleteParticipant(userId: string) {
    if (!isOwner && userId !== currentUserId) {
      return;
    }

    deleteParticipant({
      params: { path: { event_ref: meetingId, user_id: userId } },
    });

    if (editingUserId === userId) {
      handleCancelEditing();
    }
  }

  function handleClearSetupSlots() {
    if (!needsSetup) {
      return;
    }

    setDraftSlots(new Set());
  }

  function handleSaveSetup() {
    if (draftSlots.size === 0) {
      showError("Error", "Choose at least one timeslot.");
      return;
    }

    updateEvent(
      {
        params: { path: { event_ref: meetingId } },
        body: {
          slots: slotKeysToBackendSlots(
            expandHourlySlotKeysToHalfHour(draftSlots),
            backendSlotLookup,
          ),
        },
      },
      {
        onSuccess: () => {
          clearPendingSetup(meetingId);
          queryClient.invalidateQueries({
            queryKey: $when2meet.queryOptions("get", "/events/").queryKey,
          });
          setEditingUserId(null);
          setDraftSlots(new Set());
          showSuccess(
            "Timeslots saved",
            "Participants can now add their availability.",
          );
          navigate({
            to: "/when2meet/$meetingId",
            params: { meetingId: meetingSlug },
          });
        },
      },
    );
  }

  function handleToggleBookingMode() {
    if (isBookingMode) {
      setIsBookingMode(false);
      setBookingSlots(new Set());
      return;
    }

    if (editingUserId) {
      handleCancelEditing();
    }

    setIsBookingMode(true);
    setBookingSlots(new Set());
  }

  function handleBookingSlotsChange(slotKeys: string[]) {
    setBookingSlots(new Set(slotKeys));
  }

  function handleBookingSelectionEnd(slotKeys: string[]) {
    if (slotKeys.length === 0) {
      return;
    }

    setBookingSelectionKeys([...slotKeys].sort());
    setIsBookingMode(false);
    setBookingSlots(new Set());
    setPendingBookingOpen(true);
  }

  function handleBookingModalOpenChange(open: boolean) {
    setBookingModalOpen(open);
    setPendingBookingOpen(false);

    if (open) {
      return;
    }

    setBookingSelectionKeys([]);
    setSelectedBookingRoomId(null);
  }

  function handleBookingCreated(createdBooking: Booking) {
    if (bookingSelectionKeys.length === 0) {
      return;
    }

    const room = availableBookingRooms.find(
      (bookableRoom) => bookableRoom.id === selectedBookingRoomId,
    );

    if (!room) {
      return;
    }

    const savedBooking: MeetingRoomBooking = {
      id: createdBooking.id,
      slotKey: bookingSelectionKeys[0] ?? "",
      roomId: room.id,
      roomTitle: room.title,
      start: createdBooking.startsAt.toISOString(),
      end: createdBooking.endsAt.toISOString(),
    };

    saveMeetingRoomBooking(meetingSlug, savedBooking);
    setRoomBooking(savedBooking);
    showSuccess(
      "Room booked",
      `${room.title} · ${formatSlotKeyLabel(savedBooking.slotKey, formattedDates)}`,
    );
    handleBookingModalOpenChange(false);
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
      <RequireAuth>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
          </div>
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

  const allUsersViewed =
    listUsers.length > 0 &&
    listUsers.every((user) => activeViewedUserIds.has(user.id));

  return (
    <RequireAuth>
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
                <h1 className="text-2xl font-semibold">{meetingName}</h1>
              </div>
              {meetingDescription && (
                <p className="text-base-content/70 mt-2 max-w-3xl text-sm">
                  {meetingDescription}
                </p>
              )}
              <div className="text-base-content/70 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>{formatDateRangeLabel(formattedDates)}</span>
                <span>{users.length} responses</span>
                {roomBooking && bookedSlotLabel && (
                  <span className="text-primary">
                    Booked: {roomBooking.roomTitle} · {bookedSlotLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {needsSetup ? (
                isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-error"
                      disabled={draftSlots.size === 0 || isSavingSetup}
                      onClick={handleClearSetupSlots}
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary gap-2"
                      disabled={isSavingSetup}
                      onClick={handleSaveSetup}
                    >
                      {isSavingSetup ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        "Save timeslots"
                      )}
                    </button>
                  </div>
                )
              ) : (
                <>
                  {isOwner && (
                    <button
                      type="button"
                      className="btn btn-outline hidden gap-2 md:inline-flex"
                      onClick={handleShareLink}
                    >
                      <span className="icon-[material-symbols--share-outline] text-lg" />
                      Share link
                    </button>
                  )}
                  {currentUserId && (
                    <div className="hidden flex-wrap gap-2 md:flex">
                      {isEditingSelf && (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={isSaving}
                            onClick={handleCancelEditing}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-error"
                            disabled={isSaving || draftSlots.size === 0}
                            onClick={handleClearAllSlots}
                          >
                            Clear all
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary gap-2"
                        disabled={isSaving}
                        onClick={handleToggleAvailability}
                      >
                        {isEditingSelf && isSaving ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : isEditingSelf ? (
                          "Save timeslots"
                        ) : (
                          "Change my availability"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {needsSetup && (
            <div className="alert alert-warning">
              <span>
                Select the timeslots that participants can choose, then click
                Save timeslots.
              </span>
            </div>
          )}

          <section
            className={cn(
              "grid gap-5",
              needsSetup
                ? ""
                : "xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start",
            )}
          >
            <div className="bg-base-100 border-base-300 rounded-box min-w-0 border p-4 md:p-5">
              <div className="md:hidden">
                <AvailabilitySelector
                  dates={formattedDates}
                  timeSlots={timeSlots}
                  users={listUsers}
                  viewedUserIds={activeViewedUserIds}
                  editingUserId={
                    needsSetup
                      ? SETUP_USER_ID
                      : isBookingMode
                        ? null
                        : editingUserId
                  }
                  currentUserId={currentUserId}
                  draftSlots={draftSlots}
                  onApplySlots={handleApplySlots}
                  allowedSlots={allowedSlots}
                  selectionOnly={needsSetup}
                  hideHint={!!currentUser && (isEditingSelf || !isOwner)}
                  bestIntersectionSlotKeys={slotAvailability.slotKeys}
                  hoveredSlotKey={hoveredSlotKey}
                  onHoveredSlotKeyChange={setHoveredSlotKey}
                  bookingMode={isBookingMode}
                  bookingSlots={bookingSlots}
                  onBookingSlotsChange={handleBookingSlotsChange}
                  onBookingSelectionEnd={handleBookingSelectionEnd}
                  showCalendarOverlay={showCalendarOverlay}
                  calendarSlotEvents={calendarSlotEvents}
                  calendarConflictSlotKeys={
                    editingUserId === currentUserId
                      ? calendarConflictSlotKeys
                      : undefined
                  }
                  isPhone
                />
              </div>
              <div className="hidden md:block">
                <AvailabilitySelector
                  dates={formattedDates}
                  timeSlots={timeSlots}
                  users={listUsers}
                  viewedUserIds={activeViewedUserIds}
                  editingUserId={
                    needsSetup
                      ? SETUP_USER_ID
                      : isBookingMode
                        ? null
                        : editingUserId
                  }
                  currentUserId={currentUserId}
                  draftSlots={draftSlots}
                  onApplySlots={handleApplySlots}
                  allowedSlots={allowedSlots}
                  selectionOnly={needsSetup}
                  hideHint={!!currentUser && (isEditingSelf || !isOwner)}
                  bestIntersectionSlotKeys={slotAvailability.slotKeys}
                  hoveredSlotKey={hoveredSlotKey}
                  onHoveredSlotKeyChange={setHoveredSlotKey}
                  bookingMode={isBookingMode}
                  bookingSlots={bookingSlots}
                  onBookingSlotsChange={handleBookingSlotsChange}
                  onBookingSelectionEnd={handleBookingSelectionEnd}
                  showCalendarOverlay={showCalendarOverlay}
                  calendarSlotEvents={calendarSlotEvents}
                  calendarConflictSlotKeys={
                    editingUserId === currentUserId
                      ? calendarConflictSlotKeys
                      : undefined
                  }
                />
              </div>
            </div>

            {!needsSetup && (
              <aside className="grid h-fit w-full min-w-0 gap-3">
                <div className="bg-base-100 border-base-300 rounded-box flex h-fit w-full min-w-0 flex-col border p-4">
                  <h2 className="mb-3 text-lg font-semibold">Options</h2>
                  <div className="mb-3 grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-medium">
                        Minimum participants
                      </span>
                      <span className="text-base-content/70 text-base tabular-nums">
                        {minParticipants}+
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(slotAvailability.maxCount, 1)}
                      step={1}
                      value={Math.min(
                        minParticipants,
                        Math.max(slotAvailability.maxCount, 1),
                      )}
                      disabled={slotAvailability.maxCount === 0}
                      className="range range-primary range-sm w-full"
                      onChange={(event) =>
                        setMinParticipants(Number(event.target.value))
                      }
                    />
                    <div className="text-base-content/60 flex justify-between text-sm tabular-nums">
                      <span>1 (all)</span>
                      <span>{slotAvailability.maxCount || 1}</span>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="grid gap-2">
                      {roomBooking && bookedSlotLabel && (
                        <div className="border-base-300 bg-primary/5 rounded-box border p-3 text-sm">
                          <div className="text-base-content/60">
                            Booked room
                          </div>
                          <div className="font-semibold">
                            {roomBooking.roomTitle}
                          </div>
                          <div className="text-base-content/70">
                            {bookedSlotLabel}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "btn gap-2",
                          isBookingMode ? "btn-secondary" : "btn-primary",
                        )}
                        disabled={pendingBookingOpen}
                        onClick={handleToggleBookingMode}
                      >
                        {pendingBookingOpen ? (
                          <>
                            <span className="loading loading-spinner loading-sm" />
                            Loading room availability...
                          </>
                        ) : (
                          <>
                            <span className="icon-[mdi--door-open] text-lg" />
                            {isBookingMode ? "Cancel booking" : "Book room"}
                          </>
                        )}
                      </button>
                      <div className="grid w-full grid-cols-2 gap-2">
                        <Link
                          to="/when2meet/$meetingId/edit"
                          params={{ meetingId: meetingSlug }}
                          className="btn grow gap-2"
                        >
                          <span className="icon-[material-symbols--edit-outline] text-lg" />
                          Edit event
                        </Link>
                        <button
                          type="button"
                          className="btn btn-link btn-error grow gap-2 no-underline"
                          disabled={isDeletingMeeting}
                          onClick={handleDeleteMeeting}
                        >
                          {isDeletingMeeting ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : (
                            <>
                              <span className="icon-[material-symbols--delete-outline] text-lg" />
                              Delete event
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "text-base-content/70 mt-3 flex min-w-0 flex-col justify-center text-sm",
                      editingUserId !== null ? "h-9" : "h-4",
                    )}
                  >
                    {isHoveringSlot ? (
                      <>
                        <span className="block">
                          {hoveredSlotLabel}
                          {isHoveredSlotDisabled
                            ? " — No one is allowed here"
                            : hoveredSlotParticipants.length === 0
                              ? " — No one is available"
                              : ` — ${hoveredSlotParticipants.length} available`}
                        </span>
                      </>
                    ) : isHoveringCalendarSlot ? (
                      <>
                        <span className="block">{hoveredSlotLabel}</span>
                        {hoveredCalendarEvents.length > 0 && (
                          <>
                            <span className="block w-full min-w-0 truncate">
                              {hoveredCalendarEvents.join(", ")}
                            </span>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="bg-base-100 border-base-300 rounded-box flex flex-col border p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Responses</h2>
                    {listUsers.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-link"
                        onClick={handleToggleViewAllUsers}
                      >
                        {allUsersViewed ? "Hide all" : "View all"}
                      </button>
                    )}
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

                  <div className="grid max-h-[min(50vh,420px)] gap-0.5 overflow-y-auto pr-1">
                    {filteredUsers.length === 0 ? (
                      <div className="text-base-content/50 py-6 text-center text-sm">
                        No participants found.
                      </div>
                    ) : (
                      filteredUsers.map((user) => {
                        const isEditing = editingUserId === user.id;
                        const isCurrentUser = user.id === currentUserId;
                        const canDeleteOther = isOwner && !isCurrentUser;
                        const isSlotResponder =
                          isHoveringAllowedSlot && userHasHoveredSlot(user);
                        const isDimmed =
                          isHoveringAllowedSlot &&
                          !isSlotResponder &&
                          !isEditing;

                        const isViewed =
                          viewedUserIds === null || viewedUserIds.has(user.id);

                        return (
                          <div
                            key={user.id}
                            className={cn(
                              "flex min-w-0 items-center gap-1 rounded-lg py-0.5 transition-colors",
                              isEditing && "bg-primary/10",
                              isSlotResponder && !isEditing && "bg-primary/10",
                              isDimmed && "opacity-40",
                            )}
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                              onClick={() => handleToggleViewedUser(user.id)}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                                  isViewed ? "bg-primary" : "bg-base-300",
                                )}
                              />
                              <span className="truncate text-sm font-medium">
                                {user.name}
                                {isCurrentUser && (
                                  <span className="text-base-content/60 ml-1 font-normal">
                                    (you)
                                  </span>
                                )}
                              </span>
                            </button>
                            {canDeleteOther ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-square text-error shrink-0"
                                disabled={isDeletingParticipant}
                                onClick={() => handleDeleteParticipant(user.id)}
                              >
                                {isDeletingParticipant ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <span className="icon-[material-symbols--delete-outline] text-base" />
                                )}
                              </button>
                            ) : (
                              <span className="w-7 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>
            )}
          </section>
        </div>

        {(isOwner || currentUserId) && (
          <MeetingMobileBar
            onShare={isOwner && !needsSetup ? handleShareLink : undefined}
            onSaveSetup={isOwner && needsSetup ? handleSaveSetup : undefined}
            onClearSetup={
              isOwner && needsSetup ? handleClearSetupSlots : undefined
            }
            canClearSetup={draftSlots.size > 0}
            isSavingSetup={isSavingSetup}
            onToggleAvailability={
              currentUserId && !needsSetup
                ? handleToggleAvailability
                : undefined
            }
            onClearAvailability={
              currentUserId && !needsSetup ? handleClearAllSlots : undefined
            }
            onCancelAvailability={
              currentUserId && !needsSetup ? handleCancelEditing : undefined
            }
            isEditingAvailability={isEditingSelf}
            isSavingAvailability={isSaving}
            canClearAvailability={draftSlots.size > 0}
          />
        )}

        <BookingModal
          newSlot={bookingNewSlot}
          open={bookingModalOpen}
          onOpenChange={handleBookingModalOpenChange}
          onBookingCreated={handleBookingCreated}
          roomOptions={availableBookingRooms}
          selectedRoomId={selectedBookingRoomId}
          onSelectedRoomIdChange={setSelectedBookingRoomId}
          fixedSchedule
        />
      </>
    </RequireAuth>
  );
}
