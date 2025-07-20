import React from 'react';
import { X, Trophy, Clock, CheckCircle, Calendar } from 'lucide-react';
import { StudentHistoryTraining, FitnessTestResult } from '../services/types';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

interface SemesterDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterName: string;
  trainings: StudentHistoryTraining[];
  fitnessTest?: FitnessTestResult;
  loading: boolean;
}

const SemesterDetailsModal: React.FC<SemesterDetailsModalProps> = ({
  isOpen,
  onClose,
  semesterName,
  trainings,
  fitnessTest,
  loading
}) => {
  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close modal only if click was on backdrop, not on content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (date: string, time: string) => {
    try {
      // Combine date and time into a single datetime string
      const dateTimeString = `${date}T${time}:00`;
      const dateTime = new Date(dateTimeString);
      
      // Check if the date is valid
      if (isNaN(dateTime.getTime())) {
        return `${date} at ${time}`;
      }
      
      return dateTime.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // Fallback to simple format if parsing fails
      return `${date} at ${time}`;
    }
  };

  const totalHours = Array.isArray(trainings) ? trainings.reduce((sum, training) => sum + training.hours, 0) : 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-floating to-primary/30 border-2 border-secondary/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30">
          <div>
            <h3 className="text-xl font-semibold text-contrast">{semesterName}</h3>
            <p className="text-inactive text-sm">Semester details and history</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-inactive hover:text-contrast rounded-xl hover:bg-secondary/50 transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl">
                <div className="animate-spin inline-block w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full"></div>
              </div>
              <p className="text-inactive">Loading semester details...</p>
            </div>
          ) : (
            <div className="space-y-6 p-6 bg-gradient-to-b from-floating to-primary/20">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group bg-gradient-to-br from-brand-violet/10 to-brand-violet/5 border-2 border-brand-violet/30 rounded-2xl p-4 hover:border-brand-violet/50 transition-all duration-300 hover:shadow-lg hover:shadow-brand-violet/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-brand-violet/30 to-brand-violet/20 rounded-xl">
                      <Clock className="text-brand-violet" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-inactive">Total Hours</div>
                      <div className="text-lg font-semibold text-brand-violet">{totalHours}</div>
                    </div>
                  </div>
                </div>
                <div className="group bg-gradient-to-br from-success-500/10 to-success-500/5 border-2 border-success-500/30 rounded-2xl p-4 hover:border-success-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-success-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-success-500/30 to-success-500/20 rounded-xl">
                      <CheckCircle className="text-success-500" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-inactive">Attended</div>
                      <div className="text-lg font-semibold text-success-500">{Array.isArray(trainings) ? trainings.length : 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fitness Test */}
              {fitnessTest && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-contrast flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-success-500/20 to-success-500/10 rounded-xl">
                      <Trophy className="text-success-500" size={20} />
                    </div>
                    <span>Fitness Test</span>
                  </h4>
                  <div className="bg-gradient-to-r from-primary/50 to-secondary/30 border-2 border-secondary/50 rounded-2xl p-4 hover:border-success-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-contrast font-medium">
                          Total Score: {fitnessTest.total_score}
                        </div>
                        <div className="text-sm text-inactive">
                          {fitnessTest.grade ? '✅ Passed' : '❌ Not passed'} 
                          {fitnessTest.retake && ' (Retake)'}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-xl text-xs font-medium border ${
                        fitnessTest.grade 
                          ? 'bg-gradient-to-r from-success-500/20 to-success-500/10 text-success-500 border-success-500/30' 
                          : 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500 border-red-500/30'
                      }`}>
                        {fitnessTest.grade ? 'Passed' : 'Failed'}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {fitnessTest.details.map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <div className="text-contrast font-medium">{exercise.exercise}</div>
                            <div className="text-sm text-inactive">
                              {exercise.value} {exercise.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-contrast font-medium">
                              {exercise.score}/{exercise.max_score}
                            </div>
                            <div className="w-16 bg-gradient-to-r from-secondary/50 to-secondary/30 rounded-2xl h-3 shadow-inner border border-secondary/50 relative overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-brand-violet to-brand-violet/80 h-full rounded-2xl transition-all duration-500 shadow-lg"
                                style={{ width: `${(exercise.score / exercise.max_score) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Training History */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-contrast flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl">
                    <Calendar className="text-blue-500" size={20} />
                  </div>
                  <span>Training History ({Array.isArray(trainings) ? trainings.length : 0})</span>
                </h4>
                {!Array.isArray(trainings) || trainings.length === 0 ? (
                  <div className="text-center py-8 text-inactive">
                    No training sessions found for this semester
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {trainings.map((training, index) => (
                      <div key={training.training_id || index} className="bg-gradient-to-r from-primary/50 to-secondary/30 border-2 border-secondary/50 rounded-2xl p-4 hover:border-blue-500/30 hover:from-blue-500/5 hover:to-blue-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 bg-gradient-to-br from-success-500/20 to-success-500/10 rounded-lg">
                              <CheckCircle size={16} className="text-success-500" />
                            </div>
                            <div>
                              <div className="text-contrast font-medium">
                                {training.sport_name}
                                {training.group_name && ` - ${training.group_name}`}
                              </div>
                              <div className="text-inactive text-sm">
                                {training.training_class}
                              </div>
                              <div className="text-inactive text-xs">
                                {formatDate(training.date, training.time)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-brand-violet font-medium bg-brand-violet/10 px-2 py-1 rounded-lg">{training.hours}h</div>
                            <div className="text-success-500 text-xs">Completed</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemesterDetailsModal;
