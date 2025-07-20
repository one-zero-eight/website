import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { clubsAPI, Club, ClubGroup } from '../services/api';

const ClubsPage: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for opening description by club id
  const [descOpen, setDescOpen] = useState<{ [clubId: number]: boolean }>({});

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        setError(null);
        const clubsData = await clubsAPI.getClubs();
        setClubs(clubsData);
      } catch (err) {
        console.error('Error fetching clubs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clubs');
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);


  // Get upcoming trainings for all groups in a club
  const getAllUpcomingTrainings = (groups: ClubGroup[]): Array<{
    id: number;
    start: string;
    end: string;
    training_class: string;
    available_spots: number;
  }> => {
    const allTrainings: any[] = [];
    
    groups.forEach(group => {
      if (group.trainings && Array.isArray(group.trainings)) {
        group.trainings.forEach(training => {
          const endDate = new Date(training.end);
          const now = new Date();
          
          // Only include future trainings
          if (endDate > now) {
            allTrainings.push({
              id: training.id,
              start: training.start,
              end: training.end,
              training_class: training.training_class || 'Training',
              available_spots: training.available_spots
            });
          }
        });
      }
    });
    
    return allTrainings
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10); // Show up to 10 upcoming trainings
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
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-contrast mb-4">Sports Clubs</h1>
          <p className="text-lg sm:text-xl text-inactive max-w-2xl mx-auto leading-relaxed">
            Join our vibrant sports community and discover your passion. From competitive tournaments to casual fun, there's a place for everyone.
          </p>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center space-x-3">
            <Loader2 className="animate-spin text-brand-violet" size={24} />
            <span className="text-contrast">Loading clubs...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-contrast mb-4">Sports Clubs</h1>
          <p className="text-lg sm:text-xl text-inactive max-w-2xl mx-auto leading-relaxed">
            Join our vibrant sports community and discover your passion. From competitive tournaments to casual fun, there's a place for everyone.
          </p>
        </div>
        
        <div className="innohassle-card p-6 sm:p-8 text-center mx-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AlertCircle className="text-red-500" size={24} />
            <h2 className="text-xl font-semibold text-contrast">Unable to Load Clubs</h2>
          </div>
          <p className="text-inactive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="innohassle-button-primary px-6 py-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 mobile-content-bottom-padding">

      {/* Header */}
      <div className="text-center px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-contrast mb-4">Sports Clubs</h1>
        <p className="text-lg sm:text-xl text-inactive max-w-2xl mx-auto leading-relaxed">
          Join our vibrant sports community and discover your passion. From competitive tournaments to casual fun, there's a place for everyone.
        </p>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 px-4">
        {clubs.map((club) => {
          const upcomingTrainings = getAllUpcomingTrainings(club.groups).slice(0, 2);
          return (
            <div
              key={club.id}
              className="innohassle-card flex flex-col justify-between h-[370px] sm:h-[350px] overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Club Logo & Name */}
              <div className="flex flex-col items-center py-6 bg-gradient-to-b from-brand-violet/80 to-brand-violet/60">
                <div className="text-5xl mb-2">{getClubEmoji(club.name)}</div>
                <h3 className="text-xl font-bold text-white mb-1 text-center">{club.name}</h3>
                {/* Collapsible Description */}
                <div className="w-full flex flex-col items-center">
                  <button
                    className="text-xs text-white/80 underline mb-1 focus:outline-none"
                    onClick={() => setDescOpen((prev) => ({ ...prev, [club.id]: !prev[club.id] }))}
                  >
                    {descOpen[club.id] ? 'Hide description' : 'Show description'}
                  </button>
                  <div
                    className={`transition-all duration-300 text-white/90 text-sm text-center max-w-xs mx-auto ${descOpen[club.id] ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                  >
                    {club.description}
                  </div>
                </div>
              </div>
              {/* Upcoming Sessions */}
              <div className="flex-1 flex flex-col justify-between p-6">
                <div>
                  <h4 className="font-medium text-contrast mb-2 flex items-center space-x-2 justify-center">
                    <Calendar size={16} className="text-brand-violet" />
                    <span>Upcoming Sessions</span>
                  </h4>
                  {upcomingTrainings.length === 0 ? (
                    <p className="text-sm text-inactive text-center">No upcoming sessions scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingTrainings.map((training, index) => (
                        <div key={index} className="flex items-center justify-center space-x-2 text-sm">
                          <Clock size={12} className="text-brand-violet" />
                          <span className="text-contrast">
                            {new Date(training.start).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="text-inactive">
                            {new Date(training.start).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-6 justify-center">
                  <Link
                    to={`/club/${club.id}`}
                    className="innohassle-button-primary flex-1 py-2 flex items-center justify-center space-x-2"
                  >
                    <span>View Details</span>
                  </Link>
                  <button
                    className="innohassle-button-secondary flex items-center gap-1 px-3 py-2 text-xs opacity-80 cursor-not-allowed"
                    disabled
                    title="Coming soon"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.036 13.233l-0.376 4.19c0.54 0 0.775-0.232 1.06-0.509l2.544-2.432 5.28 3.857c0.967 0.534 1.66 0.253 1.902-0.893l3.448-16.19c0.314-1.293-0.495-1.8-1.32-1.48l-20.04 7.72c-1.37 0.527-1.353 1.285-0.234 1.626l5.13 1.6 11.91-7.36c0.56-0.36 1.07-0.16 0.65 0.23l-9.62 8.74z" fill="#229ED9"/>
                    </svg>
                    <span>Soon</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {clubs.length === 0 && !loading && !error && (
        <div className="innohassle-card p-6 sm:p-8 text-center mx-4">
          <h2 className="text-xl sm:text-2xl font-bold text-contrast mb-4">No Clubs Available</h2>
          <p className="text-sm sm:text-base text-inactive mb-6">
            There are currently no sports clubs available. Check back later for updates.
          </p>
        </div>
      )}

      {/* Call to Action */}
      {clubs.length > 0 && (
        <div className="innohassle-card p-6 sm:p-8 text-center mx-4">
          <h2 className="text-xl sm:text-2xl font-bold text-contrast mb-4">Ready to Get Started?</h2>
          <p className="text-sm sm:text-base text-inactive mb-6 max-w-2xl mx-auto">
            Join our sports community and start your fitness journey today. 
            Choose from various clubs and find the perfect training schedule that fits your lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/schedule"
              className="innohassle-button-primary px-4 sm:px-6 py-3 text-sm sm:text-base"
            >
              View Full Schedule
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsPage;