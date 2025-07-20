import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, UserCheck, AlertCircle, ChevronDown, ChevronUp, FileText, CheckCircle, Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import CheckoutModal from '../components/CheckoutModal';
import { MedicalReferenceModal } from '../components/MedicalReferenceModal';
import { SelfSportModal } from '../components/SelfSportModal';
import AttendanceMarkModal from '../components/AttendanceMarkModal';
import { generateSessionId } from '../utils/sessionUtils';
import { studentAPI } from '../services/studentAPI';
import { studentService } from '../services/studentService';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import ScheduleProgressHeader from '../components/ScheduleProgressHeader';
import SideActionsPanel from '../components/SideActionsPanel';
import { formatWeekRange } from '../utils/dateUtils';

// Type for one week activity (to avoid conflict with Activity icon)
type ScheduleActivity = {
  id: string;
  activity: string;
  time: string;
  dayOfWeek: string;
  date: Date;
  status: 'free' | 'booked' | 'past';
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const generateWeekActivities = async (weekStart: Date): Promise<ScheduleActivity[]> => {
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
        startTime.toLocaleDateString('en-US', { weekday: 'long' }),
        `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
        startTime
      );
      return {
        id: sessionId,
        activity: training.group_name,
        time: `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
        dayOfWeek: startTime.toLocaleDateString('en-US', { weekday: 'long' }),
        date: startTime,
        status: isPastActivity ? 'past' as const : (training.checked_in ? 'booked' as const : 'free' as const),
        maxParticipants: training.capacity,
        currentParticipants: training.participants.total_checked_in,
        isPast: isPastActivity,
        isRegistrationOpen: isRegistrationOpen && training.can_check_in,
        groupId: training.group_id,
        trainingId: training.id,
        canGrade: training.can_grade,
      };
    });
  } catch (error) {
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
  const [dailyLimitError, setDailyLimitError] = useState<string>('');
  const [medicalReferenceSuccess, setMedicalReferenceSuccess] = useState<string>('');
  const [showSelfSportModal, setShowSelfSportModal] = useState(false);

  // Local function to check if user is enrolled in activity
  const isEnrolled = (activityId: string) => {
    const activity = weekActivities.find(a => a.id === activityId);
    return activity?.status === 'booked';
  };

  // Function to count booked sessions on a specific date
  const getBookedSessionsOnDate = (targetDate: Date) => {
    const targetDateString = targetDate.toDateString();
    const bookedActivities = weekActivities.filter(activity => {
      const activityDateString = activity.date.toDateString();
      const isBooked = activity.status === 'booked';
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
  const [studentPercentile, setStudentPercentile] = useState<number | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const { user} = useAppStore();
  const isAdmin = user ? (studentService.isSuperuser(user) || studentService.isStaff(user)) : false;
  const isStudent = user ? studentService.isStudent(user) : false;

  // Add support for closing Activity Details Modal with Escape
  useModalKeyboard(isModalOpen, () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
    setIsModalLoading(false);
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

      } catch (error) {
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
      } catch (error) {
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
      setWeekActivities(prev => prev.map(activity => {
        // Parse end time to check if activity has passed
        const [, endTimeStr] = activity.time.split(' - ');
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);

        const activityEndTime = new Date(activity.date);
        activityEndTime.setHours(endHour, endMinute, 0, 0);

        const now = new Date();
        const isPastActivity = activityEndTime < now;

        return {
          ...activity,
          isPast: isPastActivity,
          status: isPastActivity ? 'past' : activity.status // Keep current booking status but mark as past if time has passed
        };
      }));
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
      const activity = weekActivities.find(a => a.id === activityId);
      if (!activity || !activity.trainingId) {
        // Training not found or missing trainingId
        return;
      }

      // Check daily limit before booking
      if (!canBookOnDate(activity.date)) {
        // Daily limit reached, showing error message
        setDailyLimitError('You can only register for two training sessions per day.');
        // Clear error after 5 seconds
        setTimeout(() => setDailyLimitError(''), 5000);
        return;
      }

      // Clear any existing error
      setDailyLimitError('');

      // Make API call to check in
      await studentAPI.checkIn(activity.trainingId);

      // Update local state to reflect the change
      setWeekActivities(prev => prev.map(activity =>
        activity.id === activityId
          ? {
              ...activity,
              status: 'booked' as const,
              currentParticipants: activity.currentParticipants + 1
            }
          : activity
      ));
    } catch (error) {
      // Error enrolling in session
    }
  };

  const confirmCancelBooking = async () => {
    if (selectedActivity) {
      try {
        setIsModalLoading(true);

        const activity = weekActivities.find(a => a.id === selectedActivity.id);
        if (!activity || !activity.trainingId) {
          // Training not found or missing trainingId
          return;
        }

        // Make API call to cancel check-in
        await studentAPI.cancelCheckIn(activity.trainingId);

        // Update local state to reflect the change
        setWeekActivities(prev => prev.map(activity =>
            activity.id === selectedActivity.id
                ? {
                  ...activity,
                  status: 'free' as const,
                  currentParticipants: Math.max(activity.currentParticipants - 1, 0)
                }
                : activity
        ));
        setShowCancelModal(false);
        setSelectedActivity(null);
      } catch (error) {
        // Error canceling enrollment
      } finally {
        setIsModalLoading(false);
      }
    }
  };


  const getActivitiesForDay = (day: string) => {
    return weekActivities.filter(activity => activity.dayOfWeek === day);
  };

  const isActivityFull = (activity: ScheduleActivity) => {
    return activity.currentParticipants >= activity.maxParticipants;
  };

  const getActivityStatus = (activity: ScheduleActivity) => {
    if (activity.isPast) return 'past';
    // Check if user is enrolled/checked in based on the activity data
    return activity.status; // This now comes from the API (checked_in field)
  };

  const getParticipantsBadgeStyle = (activity: ScheduleActivity) => {
    const availableSpots = activity.maxParticipants - activity.currentParticipants;

    if (availableSpots === 0) return 'innohassle-badge-error';
    if (availableSpots <= 3) return 'innohassle-badge-warning';
    return 'innohassle-badge-success';
  };

  const getParticipantsText = (activity: ScheduleActivity) => {
    const availableSpots = activity.maxParticipants - activity.currentParticipants;

    if (availableSpots === 0) {
      return 'Full';
    } else if (availableSpots === 1) {
      return '1 spot left';
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
            <h3 className={`text-xl font-semibold ${
                isToday
                    ? 'text-brand-violet'
                    : isPastDay
                        ? 'text-inactive opacity-50'
                        : 'text-contrast'
            }`}>
              {dayName}
            </h3>
            <p className={`text-sm ${
                isPastDay ? 'text-inactive opacity-40' : 'text-inactive'
            }`}>
              {formatDate(dayDate)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isToday && (
                <span className="innohassle-badge-primary text-xs px-2 py-1">Today</span>
            )}
            {isPastDay && (
                <button
                    onClick={() => setPastDaysCollapsed(!pastDaysCollapsed)}
                    className="flex items-center space-x-1 text-inactive hover:text-contrast transition-colors p-1"
                    title={pastDaysCollapsed ? 'Expand past day' : 'Collapse past day'}
                >
                  {pastDaysCollapsed ? (
                      <ChevronDown size={16} />
                  ) : (
                      <ChevronUp size={16} />
                  )}
                  <span className="text-xs">
                {pastDaysCollapsed ? 'Show' : 'Hide'}
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
        start: activity.date?.toISOString?.() || '',
        end: '', // Can add end if needed
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
          className="max-w-7xl mx-auto space-y-6 mobile-content-bottom-padding relative"
          style={{ backgroundColor: 'rgb(var(--color-pagebg))' }}
      >
        {/* Side actions panel */}
        <SideActionsPanel isStudent={isStudent} isAdmin={isAdmin} />
        {/* Daily Limit Error Message */}
        {dailyLimitError && (
            <div className="innohassle-card p-4 bg-gradient-to-r from-error-500/10 to-error-500/5 border-2 border-error-500/30 animate-in slide-in-from-top duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-error-500/20 rounded-xl flex items-center justify-center">
                  <AlertCircle size={20} className="text-error-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-error-500">Registration Limit Reached</h3>
                  <p className="text-sm text-error-500/80">{dailyLimitError}</p>
                </div>
                <button
                    onClick={() => setDailyLimitError('')}
                    className="ml-auto w-8 h-8 flex items-center justify-center bg-error-500/20 hover:bg-error-500/30 rounded-lg transition-colors text-error-500"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>
        )}

        {/* Medical Reference Success Message */}
        {medicalReferenceSuccess && (
            <div className="innohassle-card p-4 bg-gradient-to-r from-success-500/10 to-success-500/5 border-2 border-success-500/30 animate-in slide-in-from-top duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} className="text-success-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-success-500">Medical Certificate Uploaded</h3>
                  <p className="text-sm text-success-500/80">{medicalReferenceSuccess}</p>
                </div>
                <button
                    onClick={() => setMedicalReferenceSuccess('')}
                    className="ml-auto w-8 h-8 flex items-center justify-center bg-success-500/20 hover:bg-success-500/30 rounded-lg transition-colors text-success-500"
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-contrast">Weekly Schedule</h1>
                <p className="text-inactive text-sm sm:text-base">Enroll in your training sessions for the week</p>
              </div>
            </div>

            {/* Medical Reference Button */}
            <div className="flex items-center space-x-3">
              <button
                  onClick={() => setShowMedicalModal(true)}
                  className="innohassle-button-primary px-4 py-2 flex items-center space-x-2 text-sm font-medium transition-all duration-300 hover:scale-105"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Medical Reference</span>
                <span className="sm:hidden">Medical</span>
              </button>

              <button
                  onClick={() => setShowSelfSportModal(true)}
                  className="innohassle-button-secondary px-4 py-2 flex items-center space-x-2 text-sm font-medium transition-all duration-300 hover:scale-105 border-2 border-blue-500/30 hover:border-blue-500/50"
              >
                <Activity size={16} />
                <span className="hidden sm:inline">Self-Sport</span>
                <span className="sm:hidden">Sport</span>
              </button>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between gap-4 innohassle-card p-4 sm:p-6 bg-gradient-to-r from-floating to-primary/50 border-2 border-secondary/50 hover:border-brand-violet/30 transition-all duration-300">
          <button
              onClick={handlePreviousWeek}
              className="group innohassle-button-secondary px-4 sm:px-6 py-3 flex items-center space-x-2 flex-shrink-0 hover:scale-105 transition-transform duration-200"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="hidden xs:inline sm:hidden font-medium">Prev</span>
            <span className="hidden sm:inline font-medium">Previous week</span>
          </button>

          <div className="text-center flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-contrast truncate bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-transparent">
              {formatWeekRange(currentWeekStart)}
            </h3>
            <p className="text-xs sm:text-sm text-inactive mt-1 font-medium">
              {currentWeekStart.getFullYear()}
            </p>
          </div>

          <button
              onClick={handleNextWeek}
              className="group innohassle-button-secondary px-4 sm:px-6 py-3 flex items-center space-x-2 flex-shrink-0 hover:scale-105 transition-transform duration-200"
          >
            <span className="hidden xs:inline sm:hidden font-medium">Next</span>
            <span className="hidden sm:inline font-medium">Next week</span>
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
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
              <div className="flex items-center justify-between innohassle-card p-4 sm:p-6 bg-gradient-to-r from-primary/30 to-secondary/20 border-2 border-secondary/50 hover:border-inactive/50 transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-inactive/20 to-inactive/10 rounded-xl flex items-center justify-center">
                    <Clock size={20} className="text-inactive" />
                  </div>
                  <div>
                    <span className="text-contrast font-semibold">Past Days</span>
                    <p className="text-sm text-inactive">Activities that have ended</p>
                  </div>
                </div>
                <button
                    onClick={() => setPastDaysCollapsed(!pastDaysCollapsed)}
                    className="group flex items-center space-x-2 text-brand-violet hover:text-brand-violet/80 transition-all duration-200 bg-brand-violet/10 hover:bg-brand-violet/20 px-4 py-2 rounded-xl"
                >
                  {pastDaysCollapsed ? (
                      <>
                        <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform duration-200" />
                        <span className="text-sm font-medium">Show Past Days</span>
                      </>
                  ) : (
                      <>
                        <ChevronUp size={18} className="group-hover:-translate-y-0.5 transition-transform duration-200" />
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
                <div key={day} className="group innohassle-card overflow-hidden border-2 border-secondary/30 hover:border-brand-violet/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-violet/10 hover:-translate-y-1 transform rounded-lg">
                  {/* Day Header */}
                  <div className="bg-gradient-to-r from-primary/50 to-secondary/30 border-b border-secondary/50 px-2 py-2 group-hover:from-primary/70 group-hover:to-secondary/50 transition-all duration-300">
                    {getDayHeader(day, index)}
                  </div>

                  {/* Activities */}
                  <div className="p-2 space-y-2 bg-gradient-to-b from-floating to-primary/20">
                    {isLoadingActivities ? (
                        <div className="text-center py-12 text-inactive">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full"></div>
                          </div>
                          <p className="font-medium">Loading activities...</p>
                          <p className="text-sm mt-1 opacity-75">Please wait while we fetch the latest schedule</p>
                        </div>
                    ) : dayActivities.length === 0 ? (
                        <div className="text-center py-12 text-inactive">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary/30 to-secondary/20 rounded-2xl flex items-center justify-center">
                            <Clock size={32} className="opacity-50" />
                          </div>
                          <p className="font-medium">No activities scheduled for this day</p>
                          <p className="text-sm mt-1 opacity-75">Check back later for updates</p>
                        </div>
                    ) : (
                        dayActivities.map((activity) => {
                          const isFull = isActivityFull(activity);
                          const activityStatus = getActivityStatus(activity);
                          const hasReachedDailyLimit = !canBookOnDate(activity.date);
                          const canBook = activityStatus === 'free' && !isFull && !activity.isPast && activity.isRegistrationOpen && !hasReachedDailyLimit;

                          // ...existing code...

                          // Highlight if canGrade is true
                          const canGradeHighlight = activity.canGrade ? 'ring-4 ring-yellow-400/60 ring-offset-2' : '';

                          return (
                              <div
                                  key={activity.id}
                                  className={`group/activity p-3 sm:p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                                      activityStatus === 'booked'
                                          ? 'border-brand-violet bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 shadow-lg shadow-brand-violet/20 hover:shadow-brand-violet/30'
                                          : activity.isPast
                                              ? 'activity-past opacity-60 hover:opacity-80'
                                              : !activity.isRegistrationOpen
                                                  ? 'bg-gradient-to-r from-secondary/30 to-secondary/20 border-secondary/50 hover:border-secondary/70'
                                                  : isFull || hasReachedDailyLimit
                                                      ? 'bg-gradient-to-r from-error-500/10 to-error-500/5 border-error-500/30 hover:border-error-500/50'
                                                      : 'bg-gradient-to-r from-floating to-primary/30 border-secondary/30 hover:border-brand-violet/50 hover:from-brand-violet/5 hover:to-brand-violet/10 hover:shadow-lg hover:shadow-brand-violet/10'
                                  } ${canGradeHighlight}`}
                                  onClick={() => openActivityModal(activity)}
                              >
                                {/* Mobile Layout - Only time and name */}
                                <div className="block sm:hidden">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className={`flex items-center space-x-1 cursor-pointer ${
                                          activity.isPast ? 'text-inactive' : 'text-contrast'
                                      }`}
                                      >
                                        <Clock size={14} />
                                        <span className="font-medium text-xs hover:text-brand-violet transition-colors">{activity.time}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Users size={14} className="text-inactive" />
                                        <span className="text-contrast font-medium text-xs">{activity.activity}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {activityStatus === 'booked' && (
                                          <div className="innohassle-badge innohassle-badge-primary text-xs">
                                            ✓ Enrolled
                                          </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Desktop Layout - Full details */}
                                <div className="hidden sm:block">
                                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-4">
                                    <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                      <div className={`flex items-center space-x-1 cursor-pointer ${
                                          activity.isPast ? 'text-inactive' : 'text-contrast'
                                      }`}
                                      >
                                        <Clock size={15} />
                                        <span className="font-medium text-xs sm:text-sm hover:text-brand-violet transition-colors">{activity.time}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Users size={15} className="text-inactive" />
                                        <button
                                            className="text-contrast font-medium hover:text-brand-violet transition-colors cursor-pointer underline-offset-2 hover:underline text-xs sm:text-sm"
                                        >
                                          {activity.activity}
                                        </button>
                                      </div>
                                      {activityStatus === 'booked' && (
                                          <div className="flex items-center space-x-2">
                                            <UserCheck size={18} className="text-brand-violet" />
                                            <span className="text-xs sm:text-sm font-medium selected">You're enrolled</span>
                                          </div>
                                      )}
                                      {activity.isPast && (
                                          <div className="flex items-center space-x-2">
                                            <AlertCircle size={18} className="text-inactive" />
                                            <span className="text-xs sm:text-sm text-inactive">Past event</span>
                                          </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                      {/* Participants Counter */}
                                      <span className={`text-xs font-medium ${
                                          activity.isPast
                                              ? 'text-inactive'
                                              : 'text-contrast'
                                      }`}>
                                {activity.currentParticipants}/{activity.maxParticipants} enrolled
                              </span>

                                      {/* Availability Badge */}
                                      <span className={`${getParticipantsBadgeStyle(activity)} text-xs`}>
                                {getParticipantsText(activity)}
                              </span>

                                      {/* Action Button */}
                                      {!activity.isPast && (
                                          <div className="flex justify-end sm:justify-start">
                                            {activityStatus === 'free' ? (
                                                <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      canBook && handleBookActivity(activity.id);
                                                    }}
                                                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors h-9 ${
                                                        canBook
                                                            ? 'innohassle-button innohassle-button-primary'
                                                            : 'innohassle-button innohassle-button-secondary cursor-not-allowed opacity-60'
                                                    }`}
                                                    style={{ borderRadius: '0.75rem' }}
                                                    disabled={!canBook || isLoading}
                                                >
                                                  {isFull
                                                      ? 'Full'
                                                      : hasReachedDailyLimit
                                                          ? 'Daily Limit'
                                                          : !activity.isRegistrationOpen
                                                              ? 'Registration Closed'
                                                              : 'Enroll'
                                                  }
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      // On desktop version we use regular cancel function through modal
                                                      setSelectedActivity(activity);
                                                      setShowCancelModal(true);
                                                    }}
                                                    className="innohassle-button innohassle-button-error px-3 sm:px-4 py-2 text-xs sm:text-sm"
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
            activityName={selectedActivity?.activity || ''}
            time={selectedActivity?.time || ''}
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
              setMedicalReferenceSuccess('Medical certificate uploaded!');
              setTimeout(() => setMedicalReferenceSuccess(''), 10000);
            }}
        />

        {/* Self-Sport Modal */}
        <SelfSportModal
            isOpen={showSelfSportModal}
            onClose={() => setShowSelfSportModal(false)}
            onSuccess={() => {
              // Self-sport activity uploaded successfully
              setMedicalReferenceSuccess('Self-sport activity uploaded successfully! Your activity has been submitted for review.');
              setTimeout(() => setMedicalReferenceSuccess(''), 8000);
            }}
        />

        {/* Activity Details Modal */}
        {isModalOpen && selectedActivity && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Enhanced background overlay */}
              <div className="hidden sm:block fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

              {/* Mobile background */}
              <div className="block sm:hidden fixed inset-0 bg-pagebg" onClick={closeModal} />

              <div className="bg-pagebg max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-3xl shadow-2xl border-2 border-secondary/30 transform transition-all duration-300 scale-100">
                {/* Enhanced modal content */}
                <div className="relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-3xl -translate-y-16 translate-x-16"></div>

                  <div className="p-6 relative">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl flex items-center justify-center">
                          <span className="text-2xl">🏃</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-contrast mb-2 bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-transparent">
                            {selectedActivity.activity}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-inactive">
                            <Clock size={16} />
                            <span className="font-medium">{selectedActivity.time}</span>
                          </div>
                        </div>
                      </div>
                      <button
                          onClick={closeModal}
                          className="w-10 h-10 flex items-center justify-center bg-secondary/50 hover:bg-secondary/80 rounded-xl transition-all duration-200 text-inactive hover:text-contrast"
                      >
                        <span className="text-xl">×</span>
                      </button>
                    </div>

                    {/* Activity Details */}
                    <div className="space-y-6 mb-8">
                      <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-floating to-primary/30 rounded-2xl border border-secondary/50">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-xl flex items-center justify-center">
                          <Users className="text-brand-violet" size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-inactive font-medium">Participants</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-lg font-bold text-contrast">
                              {selectedActivity.currentParticipants}/{selectedActivity.maxParticipants}
                            </p>
                            {/* Enhanced progress bar */}
                            <div className="flex-1 max-w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                      selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.9
                                          ? 'bg-error-500'
                                          : selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.7
                                              ? 'bg-warning-500'
                                              : 'bg-success-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((selectedActivity.currentParticipants / selectedActivity.maxParticipants) * 100, 100)}%`
                                  }}
                              />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.9
                                    ? 'bg-error-500/20 text-error-500'
                                    : selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.7
                                        ? 'bg-warning-500/20 text-warning-500'
                                        : 'bg-success-500/20 text-success-500'
                            }`}>
                          {selectedActivity.maxParticipants - selectedActivity.currentParticipants} spots left
                        </span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Status Information */}
                      <div className="bg-gradient-to-r from-primary/50 to-secondary/30 rounded-2xl p-4 border border-secondary/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                                isEnrolled(selectedActivity.id)
                                    ? 'bg-brand-violet'
                                    : selectedActivity.isPast
                                        ? 'bg-inactive'
                                        : selectedActivity.currentParticipants >= selectedActivity.maxParticipants
                                            ? 'bg-error-500'
                                            : 'bg-success-500'
                            }`}></div>
                            <span className={`innohassle-badge ${
                                isEnrolled(selectedActivity.id)
                                    ? 'innohassle-badge-primary'
                                    : selectedActivity.isPast
                                        ? 'bg-inactive/20 text-inactive border-inactive/30'
                                        : selectedActivity.currentParticipants >= selectedActivity.maxParticipants
                                            ? 'innohassle-badge-error'
                                            : 'innohassle-badge-success'
                            }`}>
                          {isEnrolled(selectedActivity.id)
                              ? 'You are enrolled'
                              : selectedActivity.isPast
                                  ? 'Past event'
                                  : selectedActivity.currentParticipants >= selectedActivity.maxParticipants
                                      ? 'Full'
                                      : 'Available'
                          }
                        </span>
                          </div>
                          <span className={`text-sm font-medium ${
                              selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.8
                                  ? 'text-error-500'
                                  : selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.6
                                      ? 'text-warning-500'
                                      : 'text-success-500'
                          }`}>
                        {selectedActivity.currentParticipants >= selectedActivity.maxParticipants
                            ? 'Fully enrolled'
                            : selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.8
                                ? 'Almost full'
                                : selectedActivity.currentParticipants >= selectedActivity.maxParticipants * 0.6
                                    ? 'Filling up'
                                    : 'Spots available'
                        }
                      </span>
                        </div>
                      </div>

                      {/* Daily limit indicator */}
                      {!canBookOnDate(selectedActivity.date) && !isEnrolled(selectedActivity.id) && (
                          <div className="flex items-center space-x-3 text-warning-500 p-4 bg-gradient-to-r from-warning-500/10 to-warning-500/5 rounded-2xl border border-warning-500/30">
                            <AlertCircle size={20} />
                            <div>
                              <span className="text-sm font-semibold">Daily registration limit reached</span>
                              <p className="text-xs text-warning-500/80 mt-1">
                                You have already registered for {getBookedSessionsOnDate(selectedActivity.date)} training sessions today. Maximum 2 sessions per day.
                              </p>
                            </div>
                          </div>
                      )}

                      {/* Enrolled indicator */}
                      {isEnrolled(selectedActivity.id) && (
                          <div className="flex items-center space-x-3 text-brand-violet p-4 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 rounded-2xl border border-brand-violet/30">
                            <UserCheck size={20} />
                            <span className="text-sm font-semibold">You're enrolled in this activity</span>
                          </div>
                      )}

                      {/* Past event indicator */}
                      {selectedActivity.isPast && (
                          <div className="flex items-center space-x-3 text-inactive p-4 bg-gradient-to-r from-secondary/20 to-secondary/10 rounded-2xl border border-secondary/50">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">This activity has already ended</span>
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

                                      const activity = weekActivities.find(a => a.id === selectedActivity.id);
                                      if (!activity || !activity.trainingId) {
                                        // Training not found or missing trainingId
                                        return;
                                      }

                                      // Make API call to cancel check-in
                                      await studentAPI.cancelCheckIn(activity.trainingId);

                                      setWeekActivities(prev => prev.map(activity =>
                                          activity.id === selectedActivity.id
                                              ? {
                                                ...activity,
                                                status: 'free' as const,
                                                currentParticipants: Math.max(activity.currentParticipants - 1, 0)
                                              }
                                              : activity
                                      ));
                                      closeModal();
                                    } catch (error) {
                                      // Error canceling enrollment
                                    } finally {
                                      setIsModalLoading(false);
                                    }
                                  }}
                                  className="flex-1 innohassle-button-error py-4 text-base font-semibold rounded-2xl transition-all duration-200 hover:scale-105"
                                  disabled={isLoading || isModalLoading}
                              >
                                {isLoading || isModalLoading ? 'Canceling...' : 'Cancel Enrollment'}
                              </button>
                          ) : (
                              <button
                                  onClick={async () => {
                                    // Check daily limit before booking
                                    if (!canBookOnDate(selectedActivity.date)) {
                                      setDailyLimitError('You can only register for two training sessions per day.');
                                      setTimeout(() => setDailyLimitError(''), 5000);
                                      closeModal();
                                      return;
                                    }

                                    // On mobile version we enroll directly without additional modal
                                    if (canEnrollInMoreSessions() && selectedActivity.currentParticipants < selectedActivity.maxParticipants && selectedActivity.isRegistrationOpen) {
                                      try {
                                        setIsModalLoading(true);
                                        await handleBookActivity(selectedActivity.id);
                                        closeModal();
                                      } catch (error) {
                                        // Error enrolling
                                      } finally {
                                        setIsModalLoading(false);
                                      }
                                    }
                                  }}
                                  className={`flex-1 py-4 text-base font-semibold rounded-2xl transition-all duration-200 hover:scale-105 ${
                                      !canEnrollInMoreSessions() || selectedActivity.currentParticipants >= selectedActivity.maxParticipants || !selectedActivity.isRegistrationOpen || !canBookOnDate(selectedActivity.date)
                                          ? 'bg-secondary text-inactive cursor-not-allowed'
                                          : 'innohassle-button-primary'
                                  }`}
                                  disabled={!canEnrollInMoreSessions() || selectedActivity.currentParticipants >= selectedActivity.maxParticipants || !selectedActivity.isRegistrationOpen || !canBookOnDate(selectedActivity.date) || isLoading || isModalLoading}
                              >
                                {isLoading || isModalLoading
                                    ? 'Enrolling...'
                                    : selectedActivity.currentParticipants >= selectedActivity.maxParticipants
                                        ? 'Session Full'
                                        : !selectedActivity.isRegistrationOpen
                                            ? 'Registration Closed'
                                            : !canBookOnDate(selectedActivity.date)
                                                ? 'Daily Limit Reached'
                                                : !canEnrollInMoreSessions()
                                                    ? 'Max enrollments reached'
                                                    : 'Enroll Now'
                                }
                              </button>
                          )}
                          <button
                              onClick={closeModal}
                              className="innohassle-button-secondary px-8 py-4 text-base font-semibold rounded-2xl transition-all duration-200 hover:scale-105"
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