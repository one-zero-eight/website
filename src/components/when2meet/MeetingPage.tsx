import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { $when2meet, type when2meetTypes } from "@/api/when2meet";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { schemaToBooking } from "@/components/room-booking/timeline/types.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvailabilitySelector } from "./AvailabilitySelector.tsx";
import { ArchiveMeetingButton } from "./ArchiveMeetingButton.tsx";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";
import { MeetingRoomModal } from "./MeetingRoomModal.tsx";
import { useWhen2MeetPersonalCalendarOverlay } from "./useWhen2MeetPersonalCalendarOverlay.ts";
import {
  buildFullDaySlotKeys,
  collapseHalfHourSlotKeysToHourly,
  createBackendSlotLookup,
  expandHourlySlotKeysToHalfHour,
  getFullDayTimeSlots,
  meetingTimeToSlotKeys,
  parseBackendSlots,
  slotKeysToBackendSlots,
  slotKeysToMeetingTime,
} from "./utils/api-slots.ts";
import { getCalendarConflictSlotKeys } from "./utils/calendar-overlay.ts";
import { getIntersectionAtMinParticipants } from "./utils/best-slot.ts";
import { formatMeetingTimeRange } from "./utils/meeting-time.ts";
import {
  getFutureMeetingSlotKeys,
  isMeetingTimeInFuture,
  isPastMeetingTimeError,
  PAST_MEETING_TIME_MESSAGE,
} from "./utils/meeting-time-selection.ts";
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
  parseSlotKey,
} from "./utils/slots.ts";
import {
  clearPendingSetup,
  consumeSetupSlotPrefill,
  isPendingSetup,
} from "./utils/setup-slots.ts";
import type { MeetingUser } from "./types.ts";

const SETUP_USER_ID = "__setup__";
const MILLISECONDS_PER_MINUTE = 60_000;

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
  const { showSuccess, showError, showWarning, showConfirm } = useToast();
  const [viewedUserIds, setViewedUserIds] = useState<Set<string> | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<Set<string>>(new Set());
  const [participantSearch, setParticipantSearch] = useState("");
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [isBestTimeEnabled, setIsBestTimeEnabled] = useState(false);
  const [minParticipants, setMinParticipants] = useState(1);
  const [isChoosingMeetingTime, setIsChoosingMeetingTime] = useState(false);
  const [meetingTimeSelectionSlots, setMeetingTimeSelectionSlots] = useState<
    Set<string>
  >(new Set());
  const [pendingMeetingTime, setPendingMeetingTime] =
    useState<when2meetTypes.SchemaMeetingTime | null>(null);
  const [meetingTimeNow, setMeetingTimeNow] = useState(() => Date.now());
  const [currentTimeIndicatorNow, setCurrentTimeIndicatorNow] = useState(
    () =>
      Math.floor(Date.now() / MILLISECONDS_PER_MINUTE) *
      MILLISECONDS_PER_MINUTE,
  );
  const [isMeetingTimeRejected, setIsMeetingTimeRejected] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [isShareLinkCopied, setIsShareLinkCopied] = useState(false);
  const hasAutoStartedEditingRef = useRef(false);
  const hasInitializedSetupRef = useRef(false);
  const reconciledMissingBookingRef = useRef<string | null>(null);
  const shareLinkCopiedTimerRef = useRef<number | null>(null);

  const meetingQueryKey = $when2meet.queryOptions(
    "get",
    "/meetings/{meeting_ref}",
    {
      params: { path: { meeting_ref: meetingId } },
    },
  ).queryKey;

  const {
    data: event,
    isPending,
    isError,
    error,
  } = $when2meet.useQuery("get", "/meetings/{meeting_ref}", {
    params: { path: { meeting_ref: meetingId } },
  });

  const isOwner = !!me?.id && event?.owner_id === me.id;
  const isArchived = event?.is_archived === true;
  const currentUserId = me?.id;

  const needsSetup =
    isOwner &&
    !isArchived &&
    (setupSlots === true || isPendingSetup(meetingId));

  const { mutate: saveParticipant, isPending: isSaving } =
    $when2meet.useMutation("put", "/meetings/{meeting_ref}/participants", {
      onSuccess: (updatedEvent) => {
        queryClient.setQueryData(meetingQueryKey, updatedEvent);
        queryClient.invalidateQueries({
          queryKey: $when2meet.queryOptions("get", "/meetings/participating")
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
      "/meetings/{meeting_ref}/participants/{user_id}",
      {
        onSuccess: (updatedEvent) => {
          queryClient.setQueryData(meetingQueryKey, updatedEvent);
          queryClient.invalidateQueries({
            queryKey: $when2meet.queryOptions("get", "/meetings/participating")
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
    $when2meet.useMutation("delete", "/meetings/{meeting_ref}", {
      onSuccess: () => {
        clearPendingSetup(meetingId);
        queryClient.invalidateQueries({
          queryKey: $when2meet.queryOptions("get", "/meetings/").queryKey,
        });
        queryClient.removeQueries({ queryKey: meetingQueryKey });
        showSuccess("Meeting deleted", `"${meetingName}" was removed.`);
        navigate({ to: "/when2meet" });
      },
      onError: (deleteError) => {
        showError("Error", formatApiErrorMessage(deleteError));
      },
    });

  const { mutate: updateEvent, isPending: isUpdatingMeeting } =
    $when2meet.useMutation("patch", "/meetings/{meeting_ref}", {
      onSuccess: (updatedEvent) => {
        queryClient.setQueryData(meetingQueryKey, updatedEvent);
      },
      onError: (updateError, variables) => {
        if (
          variables.body?.selected_time &&
          isPastMeetingTimeError(updateError)
        ) {
          setIsMeetingTimeRejected(true);
          setMeetingTimeNow(Date.now());
          handlePastMeetingTimeAttempt();
          return;
        }
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

  const futureMeetingSlots = useMemo(
    () =>
      isChoosingMeetingTime
        ? getFutureMeetingSlotKeys(allowedSlots, meetingTimeNow)
        : allowedSlots,
    [allowedSlots, isChoosingMeetingTime, meetingTimeNow],
  );

  const hasPastMeetingTime =
    !!pendingMeetingTime &&
    (isMeetingTimeRejected ||
      !isMeetingTimeInFuture(pendingMeetingTime, meetingTimeNow));

  useEffect(() => {
    if (!isChoosingMeetingTime) {
      return;
    }

    function handleTimeRefresh() {
      setMeetingTimeNow(Date.now());
    }

    handleTimeRefresh();
    const timer = window.setInterval(handleTimeRefresh, 1000);
    window.addEventListener("focus", handleTimeRefresh);
    document.addEventListener("visibilitychange", handleTimeRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleTimeRefresh);
      document.removeEventListener("visibilitychange", handleTimeRefresh);
    };
  }, [isChoosingMeetingTime]);

  useEffect(() => {
    let timer: number | undefined;

    function handleCurrentTimeIndicatorRefresh() {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      const now = Date.now();
      const minuteStart =
        Math.floor(now / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE;
      setCurrentTimeIndicatorNow(minuteStart);
      timer = window.setTimeout(
        handleCurrentTimeIndicatorRefresh,
        minuteStart + MILLISECONDS_PER_MINUTE - now,
      );
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        handleCurrentTimeIndicatorRefresh();
      }
    }

    handleCurrentTimeIndicatorRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

  const selectedTimeLabel = formatMeetingTimeRange(event?.selected_time);
  const hasBookedRoom = !!event?.booked_room?.room_id;
  const canChangeMeetingTime = isOwner && !isArchived && !hasBookedRoom;

  const { data: bookedRoomDetails } = $roomBooking.useQuery(
    "get",
    "/room/{id}",
    {
      params: {
        path: { id: event?.booked_room?.room_id ?? "" },
      },
    },
    {
      enabled: !!event?.booked_room?.room_id && !needsSetup,
    },
  );

  const bookedRoomTitle =
    bookedRoomDetails?.title ?? event?.booked_room?.room_id ?? null;

  const outlookBookingId = event?.booked_room?.outlook_booking_id;
  const outlookEntryId = event?.booked_room?.outlook_entry_id;
  const bookedRoomId = event?.booked_room?.room_id;

  const bookingByIdQuery = $roomBooking.useQuery(
    "get",
    "/bookings/{outlook_booking_id}",
    {
      params: {
        path: { outlook_booking_id: outlookBookingId ?? "" },
      },
    },
    {
      enabled: !!outlookBookingId && !needsSetup,
    },
  );

  const bookingByEntryIdQuery = $roomBooking.useQuery(
    "get",
    "/bookings/by-entry-id/{outlook_entry_id}",
    {
      params: {
        path: { outlook_entry_id: outlookEntryId ?? "" },
        query: { room_id: bookedRoomId ?? "" },
      },
    },
    {
      enabled:
        !outlookBookingId && !!outlookEntryId && !!bookedRoomId && !needsSetup,
    },
  );

  const bookedRoomBookingError = outlookBookingId
    ? bookingByIdQuery.error
    : bookingByEntryIdQuery.error;
  const bookedRoomBookingDetails =
    bookingByIdQuery.data ?? bookingByEntryIdQuery.data;
  const bookedRoomBooking = useMemo(
    () =>
      bookedRoomBookingDetails
        ? schemaToBooking(bookedRoomBookingDetails)
        : undefined,
    [bookedRoomBookingDetails],
  );
  const hasBookedRoomTimeMismatch =
    !!bookedRoomBooking &&
    !bookedRoomBookingError &&
    !!event?.selected_time &&
    (bookedRoomBooking.startsAt.getTime() !==
      new Date(event.selected_time.start).getTime() ||
      bookedRoomBooking.endsAt.getTime() !==
        new Date(event.selected_time.end).getTime());
  const isBookedRoomBookingPending = outlookBookingId
    ? bookingByIdQuery.isFetching
    : !!outlookEntryId && bookingByEntryIdQuery.isFetching;
  const missingBookingReference = outlookBookingId ?? outlookEntryId ?? null;
  const isBookedRoomBookingMissing =
    isApiHttpError(bookedRoomBookingError) &&
    bookedRoomBookingError.httpCode === 404;

  const {
    mutate: reconcileMissingBooking,
    isPending: isReconcilingMissingBooking,
  } = $when2meet.useMutation("delete", "/meetings/{meeting_ref}/book-room", {
    onSuccess: (updatedMeeting) => {
      setBookingDetailsOpen(false);
      handleMeetingUpdated(updatedMeeting);
      showWarning(
        "Room booking removed",
        "The booking no longer exists in Room Booking, so it was removed from the meeting.",
      );
    },
    onError: (reconciliationError) => {
      showError("Error", formatApiErrorMessage(reconciliationError));
    },
  });

  useEffect(() => {
    if (
      !isOwner ||
      !isBookedRoomBookingMissing ||
      !missingBookingReference ||
      reconciledMissingBookingRef.current === missingBookingReference
    ) {
      return;
    }

    reconciledMissingBookingRef.current = missingBookingReference;
    reconcileMissingBooking({
      params: { path: { meeting_ref: meetingId } },
    });
  }, [
    isBookedRoomBookingMissing,
    isOwner,
    meetingId,
    missingBookingReference,
    reconcileMissingBooking,
  ]);

  function handleBookingDetailsOpenChange(open: boolean) {
    setBookingDetailsOpen(open);

    if (open) {
      return;
    }

    refetchBookedRoomBooking();
  }

  async function refetchBookedRoomBooking() {
    if (outlookBookingId) {
      return bookingByIdQuery.refetch();
    }

    if (outlookEntryId) {
      return bookingByEntryIdQuery.refetch();
    }
  }

  async function handleOpenBookingDetails() {
    const bookingDetailsResult = await refetchBookedRoomBooking();

    if (!bookingDetailsResult?.data || bookingDetailsResult.error) {
      return;
    }

    setBookingDetailsOpen(true);
  }

  const selectedMeetingSlotKeys = useMemo(() => {
    if (!event?.selected_time || !parsedSlots) {
      return new Set<string>();
    }

    return meetingTimeToSlotKeys(
      event.selected_time,
      parsedSlots.dates,
      timeSlots,
      allowedSlots,
    );
  }, [event?.selected_time, parsedSlots, timeSlots, allowedSlots]);

  const pendingMeetingTimeLabel = formatMeetingTimeRange(pendingMeetingTime);

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
    isBestTimeEnabled && !needsSetup && slotAvailability.slotKeys.size > 0;

  const meetingDateIds = useMemo(() => parsedSlots?.dates ?? [], [parsedSlots]);

  const isEditingSelf = editingUserId === currentUserId;

  const {
    slotEvents: calendarSlotEvents,
    allDayEvents: calendarAllDayEvents,
    hasCalendarData,
  } = useWhen2MeetPersonalCalendarOverlay({
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

  useEffect(() => {
    if (!isBestTimeEnabled) {
      return;
    }

    if (slotAvailability.maxCount === 0) {
      setIsBestTimeEnabled(false);
      setMinParticipants(1);
      return;
    }

    setMinParticipants(slotAvailability.maxCount);
  }, [isBestTimeEnabled, slotAvailability.maxCount]);

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

  function handleMeetingUpdated(
    updatedMeeting: when2meetTypes.SchemaEventView,
  ) {
    if (updatedMeeting.is_archived) {
      setEditingUserId(null);
      setIsChoosingMeetingTime(false);
      setRoomModalOpen(false);
      clearPendingSetup(meetingId);
    }
    queryClient.setQueryData(meetingQueryKey, updatedMeeting);
    queryClient.invalidateQueries({
      queryKey: $when2meet.queryOptions("get", "/meetings/").queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $when2meet.queryOptions("get", "/meetings/participating")
        .queryKey,
    });
  }

  function handleStartEditing(userId: string) {
    if (isArchived || userId !== currentUserId) {
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
      event.is_archived ||
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

  function handleSaveEditing() {
    if (!currentUserId || editingUserId !== currentUserId) {
      return;
    }

    saveParticipant(
      {
        params: { path: { meeting_ref: meetingId } },
        body: {
          availability: slotKeysToBackendSlots(draftSlots, backendSlotLookup),
        },
      },
      {
        onSuccess: () => {
          setEditingUserId(null);
          setDraftSlots(new Set());
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

    if (isChoosingMeetingTime) {
      handleCancelChoosingMeetingTime();
    }

    handleStartEditing(currentUserId);
  }

  function handleTimeGridDoubleClick() {
    if (
      !currentUserId ||
      isArchived ||
      needsSetup ||
      editingUserId !== null ||
      isChoosingMeetingTime
    ) {
      return;
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

  function handleToggleBestTime() {
    if (isBestTimeEnabled) {
      setIsBestTimeEnabled(false);
      setMinParticipants(1);
      return;
    }

    if (slotAvailability.maxCount === 0) {
      return;
    }

    setMinParticipants(slotAvailability.maxCount);
    setIsBestTimeEnabled(true);
  }

  async function handleDeleteParticipant(userId: string) {
    if (!isOwner && userId !== currentUserId) {
      return;
    }

    if (isOwner && userId !== currentUserId) {
      const participant = listUsers.find((user) => user.id === userId);
      const confirmed = await showConfirm({
        title: "Remove participant",
        message: `Remove ${participant?.name ?? "this participant"} from the meeting?`,
        confirmText: "Remove",
        cancelText: "Cancel",
        type: "warning",
      });

      if (!confirmed) {
        return;
      }
    }

    deleteParticipant({
      params: { path: { meeting_ref: meetingId, user_id: userId } },
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
        params: { path: { meeting_ref: meetingId } },
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
            queryKey: $when2meet.queryOptions("get", "/meetings/").queryKey,
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

  function handleCancelChoosingMeetingTime() {
    setIsChoosingMeetingTime(false);
    setMeetingTimeSelectionSlots(new Set());
    setPendingMeetingTime(null);
    setIsMeetingTimeRejected(false);
  }

  function handleStartChoosingMeetingTime() {
    if (!canChangeMeetingTime) {
      return;
    }

    if (editingUserId) {
      handleCancelEditing();
    }

    setIsChoosingMeetingTime(true);
    setMeetingTimeNow(Date.now());
    setMeetingTimeSelectionSlots(new Set());
    setPendingMeetingTime(null);
    setIsMeetingTimeRejected(false);
  }

  function handleMeetingTimeSlotsChange(slotKeys: string[]) {
    setMeetingTimeSelectionSlots(new Set(slotKeys));
    setPendingMeetingTime(null);
    setIsMeetingTimeRejected(false);
  }

  function handlePastMeetingTimeAttempt() {
    showWarning(
      "Cannot select a past time",
      "Choose a meeting start time in the future.",
    );
  }

  function handleMeetingTimeSelectionEnd(slotKeys: string[]) {
    if (slotKeys.length === 0) {
      setPendingMeetingTime(null);
      return;
    }

    const now = Date.now();
    const futureSlots = getFutureMeetingSlotKeys(allowedSlots, now);
    setMeetingTimeNow(now);
    setPendingMeetingTime(slotKeysToMeetingTime(slotKeys, timeSlots));
    const isPastSelection = slotKeys.some(
      (slotKey) => !futureSlots.has(slotKey),
    );
    setIsMeetingTimeRejected(isPastSelection);
    if (isPastSelection) {
      handlePastMeetingTimeAttempt();
    }
  }

  function handleSaveMeetingTime() {
    if (!canChangeMeetingTime || isUpdatingMeeting) {
      return;
    }

    if (!pendingMeetingTime) {
      showError("Error", "Choose a meeting time on the grid first.");
      return;
    }

    const now = Date.now();
    setMeetingTimeNow(now);
    if (
      isMeetingTimeRejected ||
      !isMeetingTimeInFuture(pendingMeetingTime, now)
    ) {
      setIsMeetingTimeRejected(true);
      handlePastMeetingTimeAttempt();
      return;
    }

    updateEvent(
      {
        params: { path: { meeting_ref: meetingId } },
        body: { selected_time: pendingMeetingTime },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: $when2meet.queryOptions("get", "/meetings/").queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: $when2meet.queryOptions("get", "/meetings/participating")
              .queryKey,
          });
          handleCancelChoosingMeetingTime();
          showSuccess(
            "Meeting time saved",
            "Everyone can now see the chosen meeting time.",
          );
        },
      },
    );
  }

  async function handleShareLink() {
    const shareUrl = `${window.location.origin}/when2meet/${meetingSlug}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      if (shareLinkCopiedTimerRef.current !== null) {
        window.clearTimeout(shareLinkCopiedTimerRef.current);
      }

      setIsShareLinkCopied(true);
      shareLinkCopiedTimerRef.current = window.setTimeout(() => {
        setIsShareLinkCopied(false);
        shareLinkCopiedTimerRef.current = null;
      }, 3000);
    } catch {
      showError("Error", "Could not copy link to clipboard.");
    }
  }

  useEffect(() => {
    return () => {
      if (shareLinkCopiedTimerRef.current !== null) {
        window.clearTimeout(shareLinkCopiedTimerRef.current);
      }
    };
  }, []);

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
      params: { path: { meeting_ref: meetingId } },
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

  const availabilitySelectorProps = {
    dates: formattedDates,
    timeSlots,
    users: listUsers,
    viewedUserIds: activeViewedUserIds,
    editingUserId: needsSetup
      ? SETUP_USER_ID
      : isChoosingMeetingTime
        ? null
        : editingUserId,
    currentUserId,
    draftSlots,
    onApplySlots: handleApplySlots,
    allowedSlots: isChoosingMeetingTime ? futureMeetingSlots : allowedSlots,
    getUnavailableSlotHint: isChoosingMeetingTime
      ? (slotKey: string) =>
          allowedSlots.has(slotKey)
            ? "Meeting start time must be in the future"
            : "Not available for this meeting"
      : undefined,
    selectionOnly: needsSetup,
    hideHint: !!currentUser && (isEditingSelf || !isOwner),
    bestIntersectionSlotKeys: isBestTimeEnabled
      ? slotAvailability.slotKeys
      : undefined,
    hoveredSlotKey,
    onHoveredSlotKeyChange: setHoveredSlotKey,
    intervalSelectionMode: isChoosingMeetingTime,
    intervalSelectionSlots: meetingTimeSelectionSlots,
    onIntervalSelectionSlotsChange: handleMeetingTimeSlotsChange,
    onIntervalSelectionEnd: handleMeetingTimeSelectionEnd,
    onPastMeetingTimeAttempt: handlePastMeetingTimeAttempt,
    selectedMeetingSlotKeys,
    showCalendarOverlay,
    calendarSlotEvents,
    calendarAllDayEvents,
    onTimeGridDoubleClick: handleTimeGridDoubleClick,
    currentTime: currentTimeIndicatorNow,
    timeZone: event.timezone,
    calendarConflictSlotKeys:
      editingUserId === currentUserId ? calendarConflictSlotKeys : undefined,
  };

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
            <div className="flex min-w-0 items-start justify-between gap-3 md:block">
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
                  {isArchived ? (
                    <span>Archived</span>
                  ) : selectedTimeLabel ? (
                    <span className="text-secondary inline-flex items-center gap-1">
                      <span className="icon-[material-symbols--schedule-outline] shrink-0 text-base" />
                      {selectedTimeLabel}
                    </span>
                  ) : null}
                  {bookedRoomTitle && (
                    <span className="text-primary">
                      Room: {bookedRoomTitle}
                    </span>
                  )}
                </div>
              </div>
              {isOwner && !needsSetup && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm shrink-0 md:hidden"
                  onClick={handleShareLink}
                >
                  <span className="relative size-5">
                    <span
                      className={cn(
                        "icon-[material-symbols--share-outline] absolute inset-0 text-xl transition-all duration-200 ease-out",
                        isShareLinkCopied
                          ? "scale-75 opacity-0"
                          : "scale-100 opacity-100",
                      )}
                    />
                    <span
                      className={cn(
                        "icon-[material-symbols--check-rounded] absolute inset-0 text-xl transition-all duration-200 ease-out",
                        isShareLinkCopied
                          ? "scale-100 opacity-100"
                          : "scale-75 opacity-0",
                      )}
                    />
                  </span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {needsSetup ? (
                isOwner && (
                  <div className="hidden flex-wrap gap-2 md:flex">
                    <button
                      type="button"
                      className="btn btn-error"
                      disabled={draftSlots.size === 0 || isUpdatingMeeting}
                      onClick={handleClearSetupSlots}
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary gap-2"
                      disabled={isUpdatingMeeting}
                      onClick={handleSaveSetup}
                    >
                      {isUpdatingMeeting ? (
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
                      className={cn(
                        "btn hidden md:inline-flex",
                        isShareLinkCopied ? "btn-ghost" : "btn-outline",
                      )}
                      onClick={handleShareLink}
                    >
                      <span className="inline-grid">
                        <span
                          className={cn(
                            "col-start-1 row-start-1 inline-flex items-center gap-2 transition-all duration-200 ease-out",
                            isShareLinkCopied
                              ? "scale-95 opacity-0"
                              : "scale-100 opacity-100",
                          )}
                        >
                          <span className="icon-[material-symbols--share-outline] text-lg" />
                          Share link
                        </span>
                        <span
                          className={cn(
                            "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out",
                            isShareLinkCopied
                              ? "scale-100 opacity-100"
                              : "scale-95 opacity-0",
                          )}
                        >
                          <span className="icon-[material-symbols--check-rounded] text-lg" />
                          Copied
                        </span>
                      </span>
                    </button>
                  )}
                  {currentUserId && !isArchived && (
                    <div className="hidden flex-wrap gap-2 md:flex">
                      {isEditingSelf ? (
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
                            className="btn btn-primary gap-2"
                            disabled={isSaving}
                            onClick={handleSaveEditing}
                          >
                            {isSaving ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : (
                              "Save timeslots"
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary gap-2"
                          disabled={isChoosingMeetingTime}
                          onClick={handleToggleAvailability}
                        >
                          Change my availability
                        </button>
                      )}
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
                <AvailabilitySelector {...availabilitySelectorProps} isPhone />
              </div>
              <div className="hidden md:block">
                <AvailabilitySelector {...availabilitySelectorProps} />
              </div>
            </div>

            {!needsSetup && (
              <aside className="grid h-fit w-full min-w-0 gap-3">
                <div className="bg-base-100 border-base-300 rounded-box flex h-fit w-full min-w-0 flex-col border p-4">
                  <h2 className="mb-3 text-lg font-semibold">Options</h2>
                  <button
                    type="button"
                    className={cn(
                      "btn mb-3 w-full justify-center gap-2",
                      isBestTimeEnabled ? "btn-ghost" : "btn-outline",
                    )}
                    disabled={slotAvailability.maxCount === 0}
                    onClick={handleToggleBestTime}
                  >
                    <span>
                      {isBestTimeEnabled ? "Hide best time" : "Show best time"}
                    </span>
                    <span
                      className={cn(
                        "icon-[material-symbols--keyboard-arrow-down-rounded] text-xl transition-transform duration-200 ease-out",
                        isBestTimeEnabled && "rotate-180",
                      )}
                    />
                  </button>

                  {isBestTimeEnabled && (
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
                        disabled={users.length <= 1}
                        className={cn(
                          "range range-sm w-full",
                          users.length <= 1
                            ? "range-neutral cursor-not-allowed opacity-50"
                            : "range-primary",
                        )}
                        onChange={(rangeEvent) =>
                          setMinParticipants(Number(rangeEvent.target.value))
                        }
                      />
                      <div className="text-base-content/60 flex justify-between text-sm tabular-nums">
                        <span>1</span>
                        <span>{slotAvailability.maxCount}</span>
                      </div>
                    </div>
                  )}

                  {selectedTimeLabel && (
                    <span className="text-secondary mb-3 inline-flex items-center gap-1 text-sm md:hidden">
                      <span className="icon-[material-symbols--schedule-outline] shrink-0 text-base" />
                      {selectedTimeLabel}
                    </span>
                  )}

                  {bookedRoomTitle && (
                    <div className="mb-3 grid gap-2">
                      <div className="border-base-300 bg-primary/5 rounded-box flex items-center gap-3 border p-3 text-sm">
                        <div className="min-w-0 grow">
                          <div className="text-base-content/60">
                            Booked room
                          </div>
                          <div className="truncate font-semibold">
                            {bookedRoomTitle}
                          </div>
                          {bookedRoomBookingError &&
                            !isBookedRoomBookingMissing && (
                              <div className="text-error mt-1 text-xs">
                                Unable to load booking details.
                              </div>
                            )}
                          {isBookedRoomBookingMissing && !isOwner && (
                            <div className="text-error mt-1 text-xs">
                              This room booking no longer exists.
                            </div>
                          )}
                        </div>
                        {isBookedRoomBookingPending ||
                        isReconcilingMissingBooking ? (
                          <span className="loading loading-spinner loading-sm text-primary shrink-0" />
                        ) : bookedRoomBooking ? (
                          <Tooltip content="Open details">
                            <button
                              type="button"
                              className="text-base-content/50 hover:bg-base-300 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                              onClick={handleOpenBookingDetails}
                            >
                              <span className="icon-[material-symbols--notes] text-3xl" />
                            </button>
                          </Tooltip>
                        ) : null}
                      </div>
                      {hasBookedRoomTimeMismatch && (
                        <div className="alert alert-warning px-4 py-2 text-sm">
                          <span>
                            Booking time differs from the selected meeting time.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isOwner && (
                    <div className="grid gap-2">
                      {isChoosingMeetingTime ? (
                        <>
                          {pendingMeetingTimeLabel && (
                            <div className="text-base-content/70 text-sm">
                              Selected: {pendingMeetingTimeLabel}
                            </div>
                          )}
                          {hasPastMeetingTime && (
                            <p className="text-error text-sm">
                              {PAST_MEETING_TIME_MESSAGE}
                            </p>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary gap-2"
                            disabled={
                              !pendingMeetingTime ||
                              hasPastMeetingTime ||
                              !canChangeMeetingTime ||
                              isUpdatingMeeting
                            }
                            onClick={handleSaveMeetingTime}
                          >
                            {isUpdatingMeeting ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : (
                              <>
                                <span className="icon-[material-symbols--schedule-outline] text-lg" />
                                Save meeting time
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={isUpdatingMeeting}
                            onClick={handleCancelChoosingMeetingTime}
                          >
                            Cancel
                          </button>
                        </>
                      ) : !isEditingSelf ? (
                        <>
                          {canChangeMeetingTime && (
                            <button
                              type="button"
                              className="btn btn-secondary gap-2"
                              onClick={handleStartChoosingMeetingTime}
                            >
                              <span className="icon-[material-symbols--schedule-outline] text-lg" />
                              Choose meeting time
                            </button>
                          )}
                          {hasBookedRoom && !isArchived && (
                            <p className="text-base-content/60 text-xs">
                              Cancel the room booking before changing the
                              meeting time.
                            </p>
                          )}
                          {event.selected_time && !isArchived && (
                            <button
                              type="button"
                              className="btn btn-primary gap-2"
                              onClick={() => setRoomModalOpen(true)}
                            >
                              <span className="icon-[mdi--door-open] text-lg" />
                              {hasBookedRoom ? "Change room" : "Book room"}
                            </button>
                          )}
                        </>
                      ) : null}
                      {!isArchived && !isChoosingMeetingTime && (
                        <div
                          className={cn(
                            "grid w-full gap-2",
                            !needsSetup && "grid-cols-2",
                          )}
                        >
                          <Link
                            to="/when2meet/$meetingId/edit"
                            params={{ meetingId: meetingSlug }}
                            className="btn grow gap-2"
                          >
                            <span className="icon-[material-symbols--edit-outline] text-lg" />
                            Edit event
                          </Link>
                          {!needsSetup && (
                            <ArchiveMeetingButton
                              meetingRef={meetingId}
                              meetingName={meetingName}
                              disabled={
                                isSaving ||
                                isUpdatingMeeting ||
                                isDeletingMeeting ||
                                isDeletingParticipant ||
                                isEditingSelf ||
                                isChoosingMeetingTime ||
                                roomModalOpen
                              }
                              onMeetingUpdated={handleMeetingUpdated}
                            />
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-link btn-error w-full gap-2 no-underline"
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
                  )}
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

                  <div
                    className={cn(
                      "text-base-content/70 mb-3 flex min-w-0 flex-col justify-center text-sm",
                      editingUserId !== null ? "h-9" : "h-4",
                    )}
                  >
                    {isHoveringSlot ? (
                      <span className="block">
                        {hoveredSlotLabel}
                        {isHoveredSlotDisabled
                          ? " — No one is allowed here"
                          : hoveredSlotParticipants.length === 0
                            ? " — No one is available"
                            : ` — ${hoveredSlotParticipants.length} available`}
                      </span>
                    ) : isHoveringCalendarSlot ? (
                      <>
                        <span className="block">{hoveredSlotLabel}</span>
                        {hoveredCalendarEvents.length > 0 && (
                          <span className="block w-full min-w-0 truncate">
                            {hoveredCalendarEvents.join(", ")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="block">No slot selected</span>
                    )}
                  </div>

                  <label className="input input-bordered mb-3 w-full rounded-xl focus:outline-none">
                    <span className="icon-[material-symbols--search] text-base-content/50" />
                    <input
                      type="text"
                      className="grow"
                      placeholder="Search participants..."
                      value={participantSearch}
                      onChange={(searchEvent) =>
                        setParticipantSearch(searchEvent.target.value)
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
                        const isMeetingOwner = user.id === event.owner_id;
                        const canDeleteOther =
                          isOwner && !isArchived && !isCurrentUser;
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
                                  "ml-2.5 h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                                  isViewed ? "bg-primary" : "bg-base-300",
                                )}
                              />
                              <span className="min-w-0 truncate text-sm">
                                {user.name}
                                {isCurrentUser && (
                                  <span className="text-base-content/60 ml-1 font-normal">
                                    (you)
                                  </span>
                                )}
                              </span>
                              {isMeetingOwner && (
                                <span className="badge badge-primary badge-outline badge-sm shrink-0 border-[1px]">
                                  Owner
                                </span>
                              )}
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
            onSaveSetup={isOwner && needsSetup ? handleSaveSetup : undefined}
            onClearSetup={
              isOwner && needsSetup ? handleClearSetupSlots : undefined
            }
            canClearSetup={draftSlots.size > 0}
            isSavingSetup={isUpdatingMeeting}
            onToggleAvailability={
              currentUserId && !needsSetup && !isArchived
                ? handleToggleAvailability
                : undefined
            }
            onCancelAvailability={
              currentUserId && !needsSetup ? handleCancelEditing : undefined
            }
            isEditingAvailability={isEditingSelf}
            isSavingAvailability={isSaving}
            selectedSlotDetails={
              !needsSetup &&
              !isEditingSelf &&
              !isChoosingMeetingTime &&
              hoveredSlotKey
                ? {
                    label: hoveredSlotLabel,
                    unavailableMessage: isHoveredSlotDisabled
                      ? "No one is allowed here"
                      : hoveredSlotParticipants.length === 0
                        ? "No one is available"
                        : undefined,
                    participantNames: hoveredSlotParticipants.map(
                      (participant) => participant.name,
                    ),
                  }
                : undefined
            }
          />
        )}

        {isOwner && (
          <MeetingRoomModal
            meetingRef={meetingId}
            open={roomModalOpen}
            onOpenChange={setRoomModalOpen}
            bookedRoom={event.booked_room}
            meetingName={meetingName}
            bookingTitle={bookedRoomBooking?.title}
            isBookingDetailsPending={
              isBookedRoomBookingPending || isReconcilingMissingBooking
            }
            bookingDetailsError={
              isBookedRoomBookingMissing ? undefined : bookedRoomBookingError
            }
            onRetryBookingDetails={refetchBookedRoomBooking}
            selectedTime={event.selected_time}
            selectedTimeLabel={selectedTimeLabel}
            onMeetingUpdated={handleMeetingUpdated}
          />
        )}

        {bookedRoomBooking && (
          <BookingModal
            detailsBooking={bookedRoomBooking}
            open={bookingDetailsOpen}
            onOpenChange={handleBookingDetailsOpenChange}
            detailsTitleOnly
          />
        )}
      </>
    </RequireAuth>
  );
}
