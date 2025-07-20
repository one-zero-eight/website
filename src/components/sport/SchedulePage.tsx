import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  Activity,
} from "lucide-react";
import { useAppStore } from "./store/useAppStore";
import CheckoutModal from "./CheckoutModal";
import { MedicalReferenceModal } from "./MedicalReferenceModal";
import { SelfSportModal } from "./SelfSportModal";
import AttendanceMarkModal from "./AttendanceMarkModal";
import { generateSessionId } from "./utils/sessionUtils";
import { studentAPI } from "./services/studentAPI";
import { studentService } from "./services/studentService";
import { useModalKeyboard } from "./hooks/useModalKeyboard";
import ScheduleProgressHeader from "./ScheduleProgressHeader";
import SideActionsPanel from "./SideActionsPanel";
import { formatWeekRange } from "./utils/dateUtils";

// Type for one week activity (to avoid conflict with Activity icon)
type ScheduleActivity = {
  id: string;
  activity: string;
  time: string;
  dayOfWeek: string;
  date: Date;
  status: "free" | "booked" | "past";
  maxParticipants: number;
  currentParticipants: number;
  isPast: boolean;
  isRegistrationOpen: boolean;
  groupId: number;
  trainingId: number;
  canGrade?: boolean;
};

// Utility functions for date handling
const getWeekStart = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0); // Set to start of day
  return weekStart;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const generateWeekActivities = async (
  weekStart: Date,
): Promise<ScheduleActivity[]> => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  try {
    const trainings = await studentAPI.getWeeklySchedule(weekStart, weekEnd);
    const now = new Date();
    return trainings.map((training: any) => {
      const startTime = new Date(training.start);
      const endTime = new Date(training.end);
      const isPastActivity = endTime < now;
      // Check if registration is open (registration opens exactly 1 week before activity starts)
      const registrationOpenTime = new Date(startTime);
      registrationOpenTime.setDate(registrationOpenTime.getDate() - 7);
      const isRegistrationOpen = now >= registrationOpenTime;
      // Generate consistent session ID
      const sessionId = generateSessionId(
        training.group_name,
        startTime.toLocaleDateString("en-US", { weekday: "long" }),
        `${startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        startTime,
      );
      return {
        id: sessionId,
        activity: training.group_name,
        time: `${startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        dayOfWeek: startTime.toLocaleDateString("en-US", { weekday: "long" }),
        date: startTime,
        status: isPastActivity
          ? ("past" as const)
          : training.checked_in
            ? ("booked" as const)
            : ("free" as const),
        maxParticipants: training.capacity,
        currentParticipants: training.participants.total_checked_in,
        isPast: isPastActivity,
        isRegistrationOpen: isRegistrationOpen && training.can_check_in,
        groupId: training.group_id,
        trainingId: training.id,
        canGrade: training.can_grade,
      };
    });
  } catch (_error) {
    // Error fetching weekly schedule
    return []; // Return empty array on error
  }
};

const SchedulePage: React.FC = () => {
  const { isLoading, canEnrollInMoreSessions } = useAppStore();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  // Attendance modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalData, setAttendanceModalData] = useState<{
    trainingId: number;
    groupId?: number;
    groupName?: string;
    start?: string;
    end?: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [dailyLimitError, setDailyLimitError] = useState<string>("");
  const [medicalReferenceSuccess, setMedicalReferenceSuccess] =
    useState<string>("");
  const [showSelfSportModal, setShowSelfSportModal] = useState(false);

  // Local function to check if user is enrolled in activity
  const isEnrolled = (activityId: string) => {
    const activity = weekActivities.find((a) => a.id === activityId);
    return activity?.status === "booked";
  };

  // Function to count booked sessions on a specific date
  const getBookedSessionsOnDate = (targetDate: Date) => {
    const targetDateString = targetDate.toDateString();
    const bookedActivities = weekActivities.filter((activity) => {
      const activityDateString = activity.date.toDateString();
      const isBooked = activity.status === "booked";
      const isSameDate = activityDateString === targetDateString;
      return isSameDate && isBooked;
    });
    return bookedActivities.length;
  };

  // Function to check if user can book another session on the target date
  const canBookOnDate = (targetDate: Date) => {
    const bookedCount = getBookedSessionsOnDate(targetDate);
    const canBook = bookedCount < 2;
    return canBook;
  };
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Initialize with current week (not hardcoded date)
    return getWeekStart(new Date());
  });
  const [weekActivities, setWeekActivities] = useState<ScheduleActivity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pastDaysCollapsed, setPastDaysCollapsed] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [studentProgress, setStudentProgress] = useState<{
    completedHours: number;
    totalHours: number;
    progressPercentage: number;
    debt: number;
    selfSportHours: number;
    isComplete: boolean;
  } | null>(null);
  const [studentPercentile, setStudentPercentile] = useState<number | null>(
    null,
  );
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const { user } = useAppStore();
  const isAdmin = user
    ? studentService.isSuperuser(user) || studentService.isStaff(user)
    : false;
  const isStudent = user ? studentService.isStudent(user) : false;

  // Add support for closing Activity Details Modal with Escape
  useModalKeyboard(isModalOpen, () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
    setIsModalLoading(false);
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Load student progress data
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        // Get profile first since it contains all the hours data we need
        const profile = await studentService.getProfile();
        const percentile = await studentService.getStudentPercentile();

        // Calculate progress directly from profile data
        const progress = studentService.calculateProgressFromProfile(profile);

        setStudentProgress(progress);
        setStudentPercentile(percentile);
        setStudentProfile(profile);
      } catch (_error) {
        // Error loading student data
      }
    };

    loadStudentData();
  }, []);

  // Update activities when week changes
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const newActivities = await generateWeekActivities(currentWeekStart);
        setWeekActivities(newActivities);
      } catch (_error) {
        // Error loading activities
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, [currentWeekStart]);

  // Update activity status every minute to handle time-based changes
  useEffect(() => {
    const updateActivityStatus = () => {
      setWeekActivities((prev) =>
        prev.map((activity) => {
          // Parse end time to check if activity has passed
          const [, endTimeStr] = activity.time.split(" - ");
          const [endHour, endMinute] = endTimeStr.split(":").map(Number);

          const activityEndTime = new Date(activity.date);
          activityEndTime.setHours(endHour, endMinute, 0, 0);

          const now = new Date();
          const isPastActivity = activityEndTime < now;

          return {
            ...activity,
            isPast: isPastActivity,
            status: isPastActivity ? "past" : activity.status, // Keep current booking status but mark as past if time has passed
          };
        }),
      );
    };

    // Set up interval to update every minute
    const interval = setInterval(updateActivityStatus, 60000);

    return () => clearInterval(interval);
  }, []); // No dependencies needed

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleBookActivity = async (activityId: string) => {
    try {
      const activity = weekActivities.find((a) => a.id === activityId);
      if (!activity || !activity.trainingId) {
        // Training not found or missing trainingId
        return;
      }

      // Check daily limit before booking
      if (!canBookOnDate(activity.date)) {
        // Daily limit reached, showing error message
        setDailyLimitError(
          "You can only register for two training sessions per day.",
        );
        // Clear error after 5 seconds
        setTimeout(() => setDailyLimitError(""), 5000);
        return;
      }

      // Clear any existing error
      setDailyLimitError("");

      // Make API call to check in
      await studentAPI.checkIn(activity.trainingId);

      // Update local state to reflect the change
      setWeekActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                status: "booked" as const,
                currentParticipants: activity.currentParticipants + 1,
              }
            : activity,
        ),
      );
    } catch (_error) {
      // Error enrolling in session
    }
  };

  const confirmCancelBooking = async () => {
    if (selectedActivity) {
      try {
        setIsModalLoading(true);

        const activity = weekActivities.find(
          (a) => a.id === selectedActivity.id,
        );
        if (!activity || !activity.trainingId) {
          // Training not found or missing trainingId
          return;
        }

        // Make API call to cancel check-in
        await studentAPI.cancelCheckIn(activity.trainingId);

        // Update local state to reflect the change
        setWeekActivities((prev) =>
          prev.map((activity) =>
            activity.id === selectedActivity.id
              ? {
                  ...activity,
                  status: "free" as const,
                  currentParticipants: Math.max(
                    activity.currentParticipants - 1,
                    0,
                  ),
                }
              : activity,
          ),
        );
        setShowCancelModal(false);
        setSelectedActivity(null);
      } catch (_error) {
        // Error canceling enrollment
      } finally {
        setIsModalLoading(false);
      }
    }
  };

  const getActivitiesForDay = (day: string) => {
    return weekActivities.filter((activity) => activity.dayOfWeek === day);
  };

  const isActivityFull = (activity: ScheduleActivity) => {
    return activity.currentParticipants >= activity.maxParticipants;
  };

  const getActivityStatus = (activity: ScheduleActivity) => {
    if (activity.isPast) return "past";
    // Check if user is enrolled/checked in based on the activity data
    return activity.status; // This now comes from the API (checked_in field)
  };

  const getParticipantsBadgeStyle = (activity: ScheduleActivity) => {
    const availableSpots =
      activity.maxParticipants - activity.currentParticipants;

    if (availableSpots === 0) return "innohassle-badge-error";
    if (availableSpots <= 3) return "innohassle-badge-warning";
    return "innohassle-badge-success";
  };

  const getParticipantsText = (activity: ScheduleActivity) => {
    const availableSpots =
      activity.maxParticipants - activity.currentParticipants;

    if (availableSpots === 0) {
      return "Full";
    } else if (availableSpots === 1) {
      return "1 spot left";
    } else {
      return `${availableSpots} spots left`;
    }
  };

  const getDayHeader = (dayName: string, index: number) => {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(currentWeekStart.getDate() + index);
    dayDate.setHours(0, 0, 0, 0); // Set to start of day for comparison

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    const isToday = dayDate.getTime() === today.getTime();
    const isPastDay = dayDate < today;

    return (
      <div className="flex items-center justify-between">
        <div>
          <h3
            className={`text-xl font-semibold ${
              isToday
                ? "text-brand-violet"
                : isPastDay
                  ? "text-inactive opacity-50"
                  : "text-contrast"
            }`}
          >
            {dayName}
          </h3>
          <p
            className={`text-sm ${
              isPastDay ? "text-inactive opacity-40" : "text-inactive"
            }`}
          >
            {formatDate(dayDate)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isToday && (
            <span className="innohassle-badge-primary px-2 py-1 text-xs">
              Today
            </span>
          )}
          {isPastDay && (
            <button
              onClick={() => setPastDaysCollapsed(!pastDaysCollapsed)}
              className="flex items-center space-x-1 p-1 text-inactive transition-colors hover:text-contrast"
              title={
                pastDaysCollapsed ? "Expand past day" : "Collapse past day"
              }
            >
              {pastDaysCollapsed ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronUp size={16} />
              )}
              <span className="text-xs">
                {pastDaysCollapsed ? "Show" : "Hide"}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const openActivityModal = (activity: any) => {
    if (activity.canGrade) {
      setAttendanceModalData({
        trainingId: activity.trainingId,
        groupId: activity.groupId,
        groupName: activity.activity,
        start: activity.date?.toISOString?.() || "",
        end: "", // Can add end if needed
      });
      setAttendanceModalOpen(true);
      return;
    }
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
    setIsModalLoading(false);
  };

  return (
    <div
      className="mobile-content-bottom-padding relative mx-auto max-w-7xl space-y-6"
      style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
    >
      {/* Side actions panel */}
      <SideActionsPanel isStudent={isStudent} isAdmin={isAdmin} />
      {/* Daily Limit Error Message */}
      {dailyLimitError && (
        <div className="innohassle-card from-error-500/10 to-error-500/5 border-error-500/30 animate-in slide-in-from-top border-2 bg-gradient-to-r p-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="bg-error-500/20 flex h-10 w-10 items-center justify-center rounded-xl">
              <AlertCircle size={20} className="text-error-500" />
            </div>
            <div>
              <h3 className="text-error-500 font-semibold">
                Registration Limit Reached
              </h3>
              <p className="text-error-500/80 text-sm">{dailyLimitError}</p>
            </div>
            <button
              onClick={() => setDailyLimitError("")}
              className="bg-error-500/20 hover:bg-error-500/30 text-error-500 ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Medical Reference Success Message */}
      {medicalReferenceSuccess && (
        <div className="innohassle-card from-success-500/10 to-success-500/5 border-success-500/30 animate-in slide-in-from-top border-2 bg-gradient-to-r p-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="bg-success-500/20 flex h-10 w-10 items-center justify-center rounded-xl">
              <CheckCircle size={20} className="text-success-500" />
            </div>
            <div>
              <h3 className="text-success-500 font-semibold">
                Medical Certificate Uploaded
              </h3>
              <p className="text-success-500/80 text-sm">
                {medicalReferenceSuccess}
              </p>
            </div>
            <button
              onClick={() => setMedicalReferenceSuccess("")}
              className="bg-success-500/20 hover:bg-success-500/30 text-success-500 ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <ScheduleProgressHeader
        studentProfile={studentProfile}
        studentProgress={studentProgress}
        studentPercentile={studentPercentile}
      />

      {/* Header */}
      <div className="text-center sm:text-left">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-contrast sm:text-3xl">
                Weekly Schedule
              </h1>
              <p className="text-sm text-inactive sm:text-base">
                Enroll in your training sessions for the week
              </p>
            </div>
          </div>

          {/* Medical Reference Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMedicalModal(true)}
              className="innohassle-button-primary flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Medical Reference</span>
              <span className="sm:hidden">Medical</span>
            </button>

            <button
              onClick={() => setShowSelfSportModal(true)}
              className="innohassle-button-secondary flex items-center space-x-2 border-2 border-blue-500/30 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 hover:border-blue-500/50"
            >
              <Activity size={16} />
              <span className="hidden sm:inline">Self-Sport</span>
              <span className="sm:hidden">Sport</span>
            </button>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="innohassle-card flex items-center justify-between gap-4 border-2 border-secondary/50 bg-gradient-to-r from-floating to-primary/50 p-4 transition-all duration-300 hover:border-brand-violet/30 sm:p-6">
        <button
          onClick={handlePreviousWeek}
          className="innohassle-button-secondary group flex flex-shrink-0 items-center space-x-2 px-4 py-3 transition-transform duration-200 hover:scale-105 sm:px-6"
        >
          <ChevronLeft
            size={18}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          <span className="xs:inline hidden font-medium sm:hidden">Prev</span>
          <span className="hidden font-medium sm:inline">Previous week</span>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h3 className="truncate bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-lg font-bold text-contrast text-transparent sm:text-xl">
            {formatWeekRange(currentWeekStart)}
          </h3>
          <p className="mt-1 text-xs font-medium text-inactive sm:text-sm">
            {currentWeekStart.getFullYear()}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          className="innohassle-button-secondary group flex flex-shrink-0 items-center space-x-2 px-4 py-3 transition-transform duration-200 hover:scale-105 sm:px-6"
        >
          <span className="xs:inline hidden font-medium sm:hidden">Next</span>
          <span className="hidden font-medium sm:inline">Next week</span>
          <ChevronRight
            size={18}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </button>
      </div>

      {/* Past Days Control - only show if there are past days */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today

        const hasPastDays = daysOfWeek.some((_, index) => {
          const dayDate = new Date(currentWeekStart);
          dayDate.setDate(currentWeekStart.getDate() + index);
          dayDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
          return dayDate < today;
        });

        if (!hasPastDays) return null;

        return (
          <div className="innohassle-card flex items-center justify-between border-2 border-secondary/50 bg-gradient-to-r from-primary/30 to-secondary/20 p-4 transition-all duration-300 hover:border-inactive/50 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-inactive/20 to-inactive/10">
                <Clock size={20} className="text-inactive" />
              </div>
              <div>
                <span className="font-semibold text-contrast">Past Days</span>
                <p className="text-sm text-inactive">
                  Activities that have ended
                </p>
              </div>
            </div>
            <button
              onClick={() => setPastDaysCollapsed(!pastDaysCollapsed)}
              className="group flex items-center space-x-2 rounded-xl bg-brand-violet/10 px-4 py-2 text-brand-violet transition-all duration-200 hover:bg-brand-violet/20 hover:text-brand-violet/80"
            >
              {pastDaysCollapsed ? (
                <>
                  <ChevronDown
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-y-0.5"
                  />
                  <span className="text-sm font-medium">Show Past Days</span>
                </>
              ) : (
                <>
                  <ChevronUp
                    size={18}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5"
                  />
                  <span className="text-sm font-medium">Hide Past Days</span>
                </>
              )}
            </button>
          </div>
        );
      })()}

      {/* Weekly Schedule Grid */}
      <div className="space-y-3">
        {daysOfWeek.map((day, index) => {
          const dayActivities = getActivitiesForDay(day);
          const dayDate = new Date(currentWeekStart);
          dayDate.setDate(currentWeekStart.getDate() + index);
          dayDate.setHours(0, 0, 0, 0); // Set to start of day for comparison

          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of today
          const isPastDay = dayDate < today;

          // Skip rendering past days if collapsed
          if (isPastDay && pastDaysCollapsed) {
            return null;
          }

          return (
            <div
              key={day}
              className="innohassle-card group transform overflow-hidden rounded-lg border-2 border-secondary/30 transition-all duration-300 hover:-translate-y-1 hover:border-brand-violet/40 hover:shadow-lg hover:shadow-brand-violet/10"
            >
              {/* Day Header */}
              <div className="border-b border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 px-2 py-2 transition-all duration-300 group-hover:from-primary/70 group-hover:to-secondary/50">
                {getDayHeader(day, index)}
              </div>

              {/* Activities */}
              <div className="space-y-2 bg-gradient-to-b from-floating to-primary/20 p-2">
                {isLoadingActivities ? (
                  <div className="py-12 text-center text-inactive">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-violet border-t-transparent"></div>
                    </div>
                    <p className="font-medium">Loading activities...</p>
                    <p className="mt-1 text-sm opacity-75">
                      Please wait while we fetch the latest schedule
                    </p>
                  </div>
                ) : dayActivities.length === 0 ? (
                  <div className="py-12 text-center text-inactive">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/20">
                      <Clock size={32} className="opacity-50" />
                    </div>
                    <p className="font-medium">
                      No activities scheduled for this day
                    </p>
                    <p className="mt-1 text-sm opacity-75">
                      Check back later for updates
                    </p>
                  </div>
                ) : (
                  dayActivities.map((activity) => {
                    const isFull = isActivityFull(activity);
                    const activityStatus = getActivityStatus(activity);
                    const hasReachedDailyLimit = !canBookOnDate(activity.date);
                    const canBook =
                      activityStatus === "free" &&
                      !isFull &&
                      !activity.isPast &&
                      activity.isRegistrationOpen &&
                      !hasReachedDailyLimit;

                    // ...existing code...

                    // Highlight if canGrade is true
                    const canGradeHighlight = activity.canGrade
                      ? "ring-4 ring-yellow-400/60 ring-offset-2"
                      : "";

                    return (
                      <div
                        key={activity.id}
                        className={`group/activity transform cursor-pointer rounded-lg border-2 p-3 transition-all duration-300 hover:scale-[1.02] sm:p-3 ${
                          activityStatus === "booked"
                            ? "border-brand-violet bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 shadow-lg shadow-brand-violet/20 hover:shadow-brand-violet/30"
                            : activity.isPast
                              ? "activity-past opacity-60 hover:opacity-80"
                              : !activity.isRegistrationOpen
                                ? "border-secondary/50 bg-gradient-to-r from-secondary/30 to-secondary/20 hover:border-secondary/70"
                                : isFull || hasReachedDailyLimit
                                  ? "from-error-500/10 to-error-500/5 border-error-500/30 hover:border-error-500/50 bg-gradient-to-r"
                                  : "border-secondary/30 bg-gradient-to-r from-floating to-primary/30 hover:border-brand-violet/50 hover:from-brand-violet/5 hover:to-brand-violet/10 hover:shadow-lg hover:shadow-brand-violet/10"
                        } ${canGradeHighlight}`}
                        onClick={() => openActivityModal(activity)}
                      >
                        {/* Mobile Layout - Only time and name */}
                        <div className="block sm:hidden">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`flex cursor-pointer items-center space-x-1 ${
                                  activity.isPast
                                    ? "text-inactive"
                                    : "text-contrast"
                                }`}
                              >
                                <Clock size={14} />
                                <span className="text-xs font-medium transition-colors hover:text-brand-violet">
                                  {activity.time}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users size={14} className="text-inactive" />
                                <span className="text-xs font-medium text-contrast">
                                  {activity.activity}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {activityStatus === "booked" && (
                                <div className="innohassle-badge innohassle-badge-primary text-xs">
                                  ✓ Enrolled
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout - Full details */}
                        <div className="hidden sm:block">
                          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-4 sm:space-y-0">
                            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                              <div
                                className={`flex cursor-pointer items-center space-x-1 ${
                                  activity.isPast
                                    ? "text-inactive"
                                    : "text-contrast"
                                }`}
                              >
                                <Clock size={15} />
                                <span className="text-xs font-medium transition-colors hover:text-brand-violet sm:text-sm">
                                  {activity.time}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users size={15} className="text-inactive" />
                                <button className="cursor-pointer text-xs font-medium text-contrast underline-offset-2 transition-colors hover:text-brand-violet hover:underline sm:text-sm">
                                  {activity.activity}
                                </button>
                              </div>
                              {activityStatus === "booked" && (
                                <div className="flex items-center space-x-2">
                                  <UserCheck
                                    size={18}
                                    className="text-brand-violet"
                                  />
                                  <span className="selected text-xs font-medium sm:text-sm">
                                    You're enrolled
                                  </span>
                                </div>
                              )}
                              {activity.isPast && (
                                <div className="flex items-center space-x-2">
                                  <AlertCircle
                                    size={18}
                                    className="text-inactive"
                                  />
                                  <span className="text-xs text-inactive sm:text-sm">
                                    Past event
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                              {/* Participants Counter */}
                              <span
                                className={`text-xs font-medium ${
                                  activity.isPast
                                    ? "text-inactive"
                                    : "text-contrast"
                                }`}
                              >
                                {activity.currentParticipants}/
                                {activity.maxParticipants} enrolled
                              </span>

                              {/* Availability Badge */}
                              <span
                                className={`${getParticipantsBadgeStyle(activity)} text-xs`}
                              >
                                {getParticipantsText(activity)}
                              </span>

                              {/* Action Button */}
                              {!activity.isPast && (
                                <div className="flex justify-end sm:justify-start">
                                  {activityStatus === "free" ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canBook)
                                          handleBookActivity(activity.id);
                                      }}
                                      className={`h-9 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                                        canBook
                                          ? "innohassle-button innohassle-button-primary"
                                          : "innohassle-button innohassle-button-secondary cursor-not-allowed opacity-60"
                                      }`}
                                      style={{ borderRadius: "0.75rem" }}
                                      disabled={!canBook || isLoading}
                                    >
                                      {isFull
                                        ? "Full"
                                        : hasReachedDailyLimit
                                          ? "Daily Limit"
                                          : !activity.isRegistrationOpen
                                            ? "Registration Closed"
                                            : "Enroll"}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // On desktop version we use regular cancel function through modal
                                        setSelectedActivity(activity);
                                        setShowCancelModal(true);
                                      }}
                                      className="innohassle-button innohassle-button-error px-3 py-2 text-xs sm:px-4 sm:text-sm"
                                      disabled={isLoading}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel booking modal */}
      <CheckoutModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedActivity(null);
        }}
        onConfirm={confirmCancelBooking}
        activityName={selectedActivity?.activity || ""}
        time={selectedActivity?.time || ""}
        isLoading={isLoading}
      />

      {/* Attendance Mark Modal */}
      <AttendanceMarkModal
        isOpen={attendanceModalOpen}
        onClose={() => {
          setAttendanceModalOpen(false);
          setAttendanceModalData(null);
        }}
        trainingId={attendanceModalData?.trainingId || 0}
        groupId={attendanceModalData?.groupId}
        groupName={attendanceModalData?.groupName}
        start={attendanceModalData?.start}
      />

      {/* Medical Reference Modal */}
      <MedicalReferenceModal
        isOpen={showMedicalModal}
        onClose={() => setShowMedicalModal(false)}
        onSuccess={() => {
          // Medical reference uploaded successfully
          setMedicalReferenceSuccess("Medical certificate uploaded!");
          setTimeout(() => setMedicalReferenceSuccess(""), 10000);
        }}
      />

      {/* Self-Sport Modal */}
      <SelfSportModal
        isOpen={showSelfSportModal}
        onClose={() => setShowSelfSportModal(false)}
        onSuccess={() => {
          // Self-sport activity uploaded successfully
          setMedicalReferenceSuccess(
            "Self-sport activity uploaded successfully! Your activity has been submitted for review.",
          );
          setTimeout(() => setMedicalReferenceSuccess(""), 8000);
        }}
      />

      {/* Activity Details Modal */}
      {isModalOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Enhanced background overlay */}
          <div
            className="fixed inset-0 hidden bg-black/60 backdrop-blur-sm sm:block"
            onClick={closeModal}
          />

          {/* Mobile background */}
          <div
            className="fixed inset-0 block bg-pagebg sm:hidden"
            onClick={closeModal}
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-lg scale-100 transform overflow-y-auto rounded-3xl border-2 border-secondary/30 bg-pagebg shadow-2xl transition-all duration-300">
            {/* Enhanced modal content */}
            <div className="relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-brand-violet/10 to-transparent blur-3xl"></div>

              <div className="relative p-6">
                {/* Modal Header */}
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
                      <span className="text-2xl">🏃</span>
                    </div>
                    <div>
                      <h3 className="mb-2 bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-2xl font-bold text-contrast text-transparent">
                        {selectedActivity.activity}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-inactive">
                        <Clock size={16} />
                        <span className="font-medium">
                          {selectedActivity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-inactive transition-all duration-200 hover:bg-secondary/80 hover:text-contrast"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>

                {/* Activity Details */}
                <div className="mb-8 space-y-6">
                  <div className="flex items-center space-x-4 rounded-2xl border border-secondary/50 bg-gradient-to-r from-floating to-primary/30 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
                      <Users className="text-brand-violet" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-inactive">
                        Participants
                      </p>
                      <div className="mt-1 flex items-center space-x-3">
                        <p className="text-lg font-bold text-contrast">
                          {selectedActivity.currentParticipants}/
                          {selectedActivity.maxParticipants}
                        </p>
                        {/* Enhanced progress bar */}
                        <div className="h-2 max-w-24 flex-1 overflow-hidden rounded-full bg-secondary/50">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedActivity.currentParticipants >=
                              selectedActivity.maxParticipants * 0.9
                                ? "bg-error-500"
                                : selectedActivity.currentParticipants >=
                                    selectedActivity.maxParticipants * 0.7
                                  ? "bg-warning-500"
                                  : "bg-success-500"
                            }`}
                            style={{
                              width: `${Math.min((selectedActivity.currentParticipants / selectedActivity.maxParticipants) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            selectedActivity.currentParticipants >=
                            selectedActivity.maxParticipants * 0.9
                              ? "bg-error-500/20 text-error-500"
                              : selectedActivity.currentParticipants >=
                                  selectedActivity.maxParticipants * 0.7
                                ? "bg-warning-500/20 text-warning-500"
                                : "bg-success-500/20 text-success-500"
                          }`}
                        >
                          {selectedActivity.maxParticipants -
                            selectedActivity.currentParticipants}{" "}
                          spots left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Status Information */}
                  <div className="rounded-2xl border border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            isEnrolled(selectedActivity.id)
                              ? "bg-brand-violet"
                              : selectedActivity.isPast
                                ? "bg-inactive"
                                : selectedActivity.currentParticipants >=
                                    selectedActivity.maxParticipants
                                  ? "bg-error-500"
                                  : "bg-success-500"
                          }`}
                        ></div>
                        <span
                          className={`innohassle-badge ${
                            isEnrolled(selectedActivity.id)
                              ? "innohassle-badge-primary"
                              : selectedActivity.isPast
                                ? "border-inactive/30 bg-inactive/20 text-inactive"
                                : selectedActivity.currentParticipants >=
                                    selectedActivity.maxParticipants
                                  ? "innohassle-badge-error"
                                  : "innohassle-badge-success"
                          }`}
                        >
                          {isEnrolled(selectedActivity.id)
                            ? "You are enrolled"
                            : selectedActivity.isPast
                              ? "Past event"
                              : selectedActivity.currentParticipants >=
                                  selectedActivity.maxParticipants
                                ? "Full"
                                : "Available"}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          selectedActivity.currentParticipants >=
                          selectedActivity.maxParticipants * 0.8
                            ? "text-error-500"
                            : selectedActivity.currentParticipants >=
                                selectedActivity.maxParticipants * 0.6
                              ? "text-warning-500"
                              : "text-success-500"
                        }`}
                      >
                        {selectedActivity.currentParticipants >=
                        selectedActivity.maxParticipants
                          ? "Fully enrolled"
                          : selectedActivity.currentParticipants >=
                              selectedActivity.maxParticipants * 0.8
                            ? "Almost full"
                            : selectedActivity.currentParticipants >=
                                selectedActivity.maxParticipants * 0.6
                              ? "Filling up"
                              : "Spots available"}
                      </span>
                    </div>
                  </div>

                  {/* Daily limit indicator */}
                  {!canBookOnDate(selectedActivity.date) &&
                    !isEnrolled(selectedActivity.id) && (
                      <div className="text-warning-500 from-warning-500/10 to-warning-500/5 border-warning-500/30 flex items-center space-x-3 rounded-2xl border bg-gradient-to-r p-4">
                        <AlertCircle size={20} />
                        <div>
                          <span className="text-sm font-semibold">
                            Daily registration limit reached
                          </span>
                          <p className="text-warning-500/80 mt-1 text-xs">
                            You have already registered for{" "}
                            {getBookedSessionsOnDate(selectedActivity.date)}{" "}
                            training sessions today. Maximum 2 sessions per day.
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Enrolled indicator */}
                  {isEnrolled(selectedActivity.id) && (
                    <div className="flex items-center space-x-3 rounded-2xl border border-brand-violet/30 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 p-4 text-brand-violet">
                      <UserCheck size={20} />
                      <span className="text-sm font-semibold">
                        You're enrolled in this activity
                      </span>
                    </div>
                  )}

                  {/* Past event indicator */}
                  {selectedActivity.isPast && (
                    <div className="flex items-center space-x-3 rounded-2xl border border-secondary/50 bg-gradient-to-r from-secondary/20 to-secondary/10 p-4 text-inactive">
                      <AlertCircle size={20} />
                      <span className="text-sm font-medium">
                        This activity has already ended
                      </span>
                    </div>
                  )}
                </div>

                {/* Enhanced Action Buttons */}
                {!selectedActivity.isPast && (
                  <div className="flex space-x-4">
                    {isEnrolled(selectedActivity.id) ? (
                      <button
                        onClick={async () => {
                          // On mobile version we cancel enrollment directly without additional modal
                          try {
                            setIsModalLoading(true);

                            const activity = weekActivities.find(
                              (a) => a.id === selectedActivity.id,
                            );
                            if (!activity || !activity.trainingId) {
                              // Training not found or missing trainingId
                              return;
                            }

                            // Make API call to cancel check-in
                            await studentAPI.cancelCheckIn(activity.trainingId);

                            setWeekActivities((prev) =>
                              prev.map((activity) =>
                                activity.id === selectedActivity.id
                                  ? {
                                      ...activity,
                                      status: "free" as const,
                                      currentParticipants: Math.max(
                                        activity.currentParticipants - 1,
                                        0,
                                      ),
                                    }
                                  : activity,
                              ),
                            );
                            closeModal();
                          } catch (_error) {
                            // Error canceling enrollment
                          } finally {
                            setIsModalLoading(false);
                          }
                        }}
                        className="innohassle-button-error flex-1 rounded-2xl py-4 text-base font-semibold transition-all duration-200 hover:scale-105"
                        disabled={isLoading || isModalLoading}
                      >
                        {isLoading || isModalLoading
                          ? "Canceling..."
                          : "Cancel Enrollment"}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          // Check daily limit before booking
                          if (!canBookOnDate(selectedActivity.date)) {
                            setDailyLimitError(
                              "You can only register for two training sessions per day.",
                            );
                            setTimeout(() => setDailyLimitError(""), 5000);
                            closeModal();
                            return;
                          }

                          // On mobile version we enroll directly without additional modal
                          if (
                            canEnrollInMoreSessions() &&
                            selectedActivity.currentParticipants <
                              selectedActivity.maxParticipants &&
                            selectedActivity.isRegistrationOpen
                          ) {
                            try {
                              setIsModalLoading(true);
                              await handleBookActivity(selectedActivity.id);
                              closeModal();
                            } catch (_error) {
                              // Error enrolling
                            } finally {
                              setIsModalLoading(false);
                            }
                          }
                        }}
                        className={`flex-1 rounded-2xl py-4 text-base font-semibold transition-all duration-200 hover:scale-105 ${
                          !canEnrollInMoreSessions() ||
                          selectedActivity.currentParticipants >=
                            selectedActivity.maxParticipants ||
                          !selectedActivity.isRegistrationOpen ||
                          !canBookOnDate(selectedActivity.date)
                            ? "cursor-not-allowed bg-secondary text-inactive"
                            : "innohassle-button-primary"
                        }`}
                        disabled={
                          !canEnrollInMoreSessions() ||
                          selectedActivity.currentParticipants >=
                            selectedActivity.maxParticipants ||
                          !selectedActivity.isRegistrationOpen ||
                          !canBookOnDate(selectedActivity.date) ||
                          isLoading ||
                          isModalLoading
                        }
                      >
                        {isLoading || isModalLoading
                          ? "Enrolling..."
                          : selectedActivity.currentParticipants >=
                              selectedActivity.maxParticipants
                            ? "Session Full"
                            : !selectedActivity.isRegistrationOpen
                              ? "Registration Closed"
                              : !canBookOnDate(selectedActivity.date)
                                ? "Daily Limit Reached"
                                : !canEnrollInMoreSessions()
                                  ? "Max enrollments reached"
                                  : "Enroll Now"}
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="innohassle-button-secondary rounded-2xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:scale-105"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
