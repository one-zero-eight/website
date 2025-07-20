import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Clock, CheckCircle, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generateSessionId, formatSessionDate } from '../utils/sessionUtils';
import { clubsAPI, Club, ClubGroup } from '../services/api';
import { studentAPI } from '../services/studentAPI';

const ClubPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { enrollInSession, cancelEnrollment, isEnrolled } = useAppStore();
  const [enrollmentLoading, setEnrollmentLoading] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const fetchClub = async () => {
      try {
        setLoading(true);
        setError(null);
        const clubsData = await clubsAPI.getClubs();
        const foundClub = clubsData.find(c => c.id.toString() === clubId);
        if (foundClub) {
          setClub(foundClub);
        } else {
          setError('Club not found');
        }
      } catch (err) {
        // Error fetching club
        setError(err instanceof Error ? err.message : 'Failed to load club');
      } finally {
        setLoading(false);
      }
    };

    if (clubId) {
      fetchClub();
    }
  }, [clubId]);

  const handleEnrollment = async (sessionId: string, trainingId?: number) => {
    setEnrollmentLoading(sessionId);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      if (trainingId) {
        // Find session in upcomingSessions to determine if user is already enrolled
        const sessions = getUpcomingSessions(club?.groups || [], club?.name);
        const session = sessions.find(s => s.id === sessionId);
        
        if (session?.isEnrolled) {
          await studentAPI.cancelCheckIn(trainingId);
          setSuccessMessage('You have successfully cancelled your training enrollment!');
        } else {
          // Check daily limit before enrollment
          if (!canBookOnDate(session?.sessionDate)) {
            setErrorMessage('You cannot enroll in more than 2 trainings per day.');
            setTimeout(() => setErrorMessage(''), 5000);
            return;
          }
          
          await studentAPI.checkIn(trainingId);
          setSuccessMessage('You have successfully enrolled in the training!');
        }
        
        // Update club data after enrollment/cancellation
        const clubsData = await clubsAPI.getClubs();
        const updatedClub = clubsData.find(c => c.id.toString() === clubId);
        if (updatedClub) {
          setClub(updatedClub);
        }
        
        // Remove messages after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
          setErrorMessage('');
        }, 3000);
      } else {
        // Fallback to old logic if no trainingId
        if (isEnrolled(sessionId)) {
          await cancelEnrollment(sessionId);
        } else {
          await enrollInSession(sessionId);
        }
      }
    } catch (error) {
      // Enrollment error
      setErrorMessage('Error during enrollment/cancellation. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setEnrollmentLoading(null);
    }
  };

  const getUpcomingSessions = (groups: ClubGroup[], clubName?: string) => {
    const now = new Date();
    const upcomingSessions: any[] = [];
    
    // Process all club groups
    groups.forEach(group => {
      // Check if group has trainings
      if (!group.trainings || !Array.isArray(group.trainings)) {
        return;
      }
      
      // Process existing trainings from API
      group.trainings.forEach(training => {
        const sessionDate = new Date(training.start);
        const sessionEndDate = new Date(training.end);
        
        // Check that training hasn't passed yet
        if (sessionEndDate <= now) {
          return;
        }
        
        // Check if registration is possible (one week before training)
        const registrationOpenTime = new Date(sessionDate);
        registrationOpenTime.setDate(sessionDate.getDate() - 7);
        const canRegister = now >= registrationOpenTime && training.can_check_in;
        
        const sessionId = generateSessionId(
          group.name || `${clubName} Group`,
          sessionDate.toLocaleDateString('en-US', { weekday: 'long' }),
          `${sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${sessionEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          sessionDate
        );
        
        upcomingSessions.push({
          id: sessionId,
          trainingId: training.id,
          groupId: group.id,
          groupName: group.name || `${clubName} Group`,
          sessionDate,
          startTime: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: sessionEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          location: training.training_class || 'TBA',
          capacity: training.capacity,
          enrolled: training.participants.total_checked_in,
          availableSpots: training.available_spots,
          canRegister,
          isEnrolled: training.checked_in,
          dayOfWeek: sessionDate.toLocaleDateString('en-US', { weekday: 'long' }),
          isPast: sessionEndDate <= now
        });
      });
    });
    
    return upcomingSessions
      .sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())
      .slice(0, 20); // Show up to 20 upcoming trainings
  };

  // Function to count booked sessions on a specific date
  const getBookedSessionsOnDate = (targetDate: Date) => {
    const targetDateString = targetDate.toDateString();
    const allSessions = getUpcomingSessions(club?.groups || [], club?.name);
    
    const bookedSessions = allSessions.filter(session => {
      const sessionDateString = session.sessionDate.toDateString();
      const isBooked = session.isEnrolled;
      const isSameDate = sessionDateString === targetDateString;
      return isSameDate && isBooked;
    });
    
    return bookedSessions.length;
  };

  // Function to check if you can book a training on this day
  const canBookOnDate = (targetDate: Date) => {
    const bookedCount = getBookedSessionsOnDate(targetDate);
    return bookedCount < 2;
  };

  // Function to get session status
  const getSessionStatus = (session: any) => {
    const now = new Date();
    
    // Training is considered past if start time has passed
    if (session.sessionDate <= now) return 'past';
    if (session.isEnrolled) return 'enrolled';
    if (session.availableSpots <= 0) return 'full';
    if (!session.canRegister) return 'closed';
    
    // Check daily limit only for trainings that can be registered for
    if (session.canRegister && !canBookOnDate(session.sessionDate)) return 'daily-limit';
    
    return 'available';
  };

  // Function to get status styles
  const getSessionStatusStyles = (status: string) => {
    switch (status) {
      case 'enrolled':
        return {
          border: 'border-brand-violet/50 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5',
          text: 'text-contrast'
        };
      case 'available':
        return {
          border: 'border-success-500/30 bg-gradient-to-r from-success-500/10 to-success-500/5 hover:border-success-500/50',
          text: 'text-contrast'
        };
      case 'full':
        return {
          border: 'border-error-500/30 bg-gradient-to-r from-error-500/10 to-error-500/5',
          text: 'text-contrast'
        };
      case 'daily-limit':
        return {
          border: 'border-warning-500/30 bg-gradient-to-r from-warning-500/10 to-warning-500/5',
          text: 'text-contrast'
        };
      case 'closed':
        return {
          border: 'border-secondary/30 bg-gradient-to-r from-secondary/20 to-secondary/10',
          text: 'text-inactive'
        };
      case 'past':
        return {
          border: 'border-secondary/20 bg-gradient-to-r from-secondary/10 to-secondary/5',
          text: 'text-inactive opacity-60'
        };
      default:
        return {
          border: 'border-secondary hover:border-brand-violet/30',
          text: 'text-contrast'
        };
    }
  };

  // Get emoji for club based on name
  const getClubEmoji = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('table tennis') || lowerName.includes('настольный теннис')) return '🏓';
    if (lowerName.includes('basketball') || lowerName.includes('баскетбол')) return '🏀';
    if (lowerName.includes('swimming') || lowerName.includes('плавание')) return '🏊‍♂️';
    if (lowerName.includes('volleyball') || lowerName.includes('волейбол')) return '🏐';
    if (lowerName.includes('tennis') || lowerName.includes('теннис')) return '🎾';
    if (lowerName.includes('football') || lowerName.includes('футбол')) return '⚽';
    if (lowerName.includes('boxing') || lowerName.includes('бокс')) return '🥊';
    if (lowerName.includes('gym') || lowerName.includes('тренажерн')) return '🏋️‍♂️';
    if (lowerName.includes('yoga') || lowerName.includes('йога')) return '🧘‍♀️';
    if (lowerName.includes('dance') || lowerName.includes('танц')) return '💃';
    return '🏃‍♂️';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/clubs"
            className="flex items-center space-x-2 text-brand-violet hover:text-brand-violet/80 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Clubs</span>
          </Link>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center space-x-3">
            <Loader2 className="animate-spin text-brand-violet" size={24} />
            <span className="text-contrast">Loading club details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/clubs"
            className="flex items-center space-x-2 text-brand-violet hover:text-brand-violet/80 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Clubs</span>
          </Link>
        </div>
        <div className="innohassle-card p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AlertCircle className="text-red-500" size={24} />
            <h2 className="text-xl font-semibold text-contrast">Club Not Found</h2>
          </div>
          <p className="text-inactive mb-4">{error || 'The club you\'re looking for doesn\'t exist.'}</p>
          <Link to="/clubs" className="innohassle-button-primary">
            Back to Clubs
          </Link>
        </div>
      </div>
    );
  }

  const upcomingSessions = getUpcomingSessions(club.groups, club.name);
  const emoji = getClubEmoji(club.name);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="innohassle-card p-4 bg-gradient-to-r from-success-500/10 to-success-500/5 border-2 border-success-500/30">
          <div className="flex items-center space-x-3">
            <CheckCircle size={20} className="text-success-500" />
            <span className="text-success-500 font-medium">{successMessage}</span>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="innohassle-card p-4 bg-gradient-to-r from-error-500/10 to-error-500/5 border-2 border-error-500/30">
          <div className="flex items-center space-x-3">
            <AlertCircle size={20} className="text-error-500" />
            <span className="text-error-500 font-medium">{errorMessage}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/clubs"
          className="flex items-center space-x-2 text-brand-violet hover:text-brand-violet/80 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm sm:text-base">Back to Clubs</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Content */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Club Header */}
          <div className="innohassle-card overflow-hidden">
            <div className="bg-gradient-to-r from-brand-violet to-brand-violet/80 p-6 sm:p-8 text-white">
              <div className="flex flex-col items-start">
                <div className="text-4xl sm:text-6xl mb-2">{emoji}</div>
                <h1 className="text-2xl sm:text-3xl font-bold">{club.name}</h1>
                <p className="text-white/90 mt-2 text-sm sm:text-base">{club.description}</p>
              </div>
            </div>
          </div>

          {/* Training Groups */}
          <div className="innohassle-card p-6">
            <h2 className="text-xl font-bold text-contrast mb-6">Training Groups</h2>
            <div className="space-y-4">
              {club.groups.map((group, index) => (
                <div key={group.id} className="border border-secondary rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-contrast">
                    {group.name || `Group ${index + 1}`}
                  </h3>
                  {/* Medical groups info */}
                  {Array.isArray(group.allowed_medical_groups) && group.allowed_medical_groups.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-inactive">Allowed medical groups:&nbsp;</span>
                      <span className="text-xs text-brand-violet font-semibold">{group.allowed_medical_groups.join(', ')}</span>
                    </div>
                  )}
                  {group.trainers && group.trainers.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-medium text-contrast mb-2">Trainers:</h4>
                      <div className="space-y-1">
                        {group.trainers.map((trainer) => (
                          <div key={trainer.id} className="flex items-center space-x-2 text-sm">
                            <Trophy size={14} className="text-brand-violet" />
                            <span className="text-contrast">{trainer.name}</span>
                            <span className="text-inactive">({trainer.email})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Training Sessions */}
          <div className="innohassle-card p-6">
            <h2 className="text-xl font-bold text-contrast mb-6">Upcoming Training Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto text-inactive mb-4" size={48} />
                <h3 className="text-lg font-medium text-contrast mb-2">No Upcoming Sessions</h3>
                <p className="text-inactive mb-4">
                  The schedule might not be published yet or all sessions for the upcoming weeks have already passed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.slice(0, 10).map((session) => {
                  const status = getSessionStatus(session);
                  const statusStyles = getSessionStatusStyles(status);
                  return (
                    <div key={session.id} className={`border rounded-lg p-4 transition-all ${statusStyles.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Training name in large font */}
                          <div className="mb-3">
                            <h3 className={`text-lg font-semibold ${statusStyles.text}`}>
                              {session.groupName}
                            </h3>
                            {session.groupName !== session.dayOfWeek && (
                              <p className={`text-sm mt-1 ${statusStyles.text}`}>
                                {session.dayOfWeek}
                              </p>
                            )}
                          </div>
                          
                          {/* Details in small font */}
                          <div className="space-y-1">
                            <div className={`flex items-center space-x-4 text-sm ${statusStyles.text}`}>
                              <div className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>{formatSessionDate(session.sessionDate)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock size={14} />
                                <span>{session.startTime} - {session.endTime}</span>
                              </div>
                            </div>
                            <div className={`flex items-center space-x-4 text-sm ${statusStyles.text}`}>
                              <div className="flex items-center space-x-1">
                                <MapPin size={14} />
                                <span>{session.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users size={14} />
                                <span>
                                  {session.enrolled}/{session.capacity} enrolled
                                  {session.availableSpots > 0 && ` (${session.availableSpots} spots left)`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Status Information */}
                            {status === 'daily-limit' && (
                              <div className="flex items-center space-x-1 text-xs text-warning-500">
                                <AlertCircle size={12} />
                                <span>You are already enrolled in {getBookedSessionsOnDate(session.sessionDate)} trainings on this day</span>
                              </div>
                            )}
                            {status === 'closed' && !session.isPast && (
                              <div className="flex items-center space-x-1 text-xs text-inactive">
                                <Clock size={12} />
                                <span>
                                  Registration opens {(() => {
                                    const registrationDate = new Date(session.sessionDate);
                                    registrationDate.setDate(registrationDate.getDate() - 7);
                                    return registrationDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                          {/* Status Indicators */}
                          {session.isEnrolled && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="text-brand-violet" size={20} />
                              <span className="text-xs text-brand-violet font-medium">Enrolled</span>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          {status === 'available' || session.isEnrolled ? (
                            <button
                              onClick={() => handleEnrollment(session.id, session.trainingId)}
                              disabled={enrollmentLoading === session.id}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                session.isEnrolled
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'innohassle-button-primary'
                              }`}
                            >
                              {enrollmentLoading === session.id ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : session.isEnrolled ? (
                                'Cancel'
                              ) : (
                                'Enroll'
                              )}
                            </button>
                          ) : (
                            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary/50 text-inactive cursor-not-allowed">
                              {status === 'daily-limit' && 'Daily Limit'}
                              {status === 'full' && 'Full'}
                              {status === 'closed' && 'Registration Closed'}
                              {status === 'past' && 'Past Event'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="innohassle-card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-contrast mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/schedule"
                className="innohassle-button-primary w-full py-3 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Calendar size={18} />
                <span>View Full Schedule</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubPage;
