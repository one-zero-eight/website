import React from "react";
import { X, Trophy, Clock, CheckCircle, Calendar } from "lucide-react";
import { StudentHistoryTraining, FitnessTestResult } from "./services/types";
import { useModalKeyboard } from "./hooks/useModalKeyboard";

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
  loading,
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

      return dateTime.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_error) {
      // Fallback to simple format if parsing fails
      return `${date} at ${time}`;
    }
  };

  const totalHours = Array.isArray(trainings)
    ? trainings.reduce((sum, training) => sum + training.hours, 0)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="max-h-[90vh] w-full max-w-2xl scale-100 transform overflow-hidden rounded-3xl border-2 border-secondary/50 bg-gradient-to-br from-floating to-primary/30 shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 p-6">
          <div>
            <h3 className="text-xl font-semibold text-contrast">
              {semesterName}
            </h3>
            <p className="text-sm text-inactive">
              Semester details and history
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-inactive transition-all duration-200 hover:scale-110 hover:bg-secondary/50 hover:text-contrast"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-violet border-t-transparent"></div>
              </div>
              <p className="text-inactive">Loading semester details...</p>
            </div>
          ) : (
            <div className="space-y-6 bg-gradient-to-b from-floating to-primary/20 p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group rounded-2xl border-2 border-brand-violet/30 bg-gradient-to-br from-brand-violet/10 to-brand-violet/5 p-4 transition-all duration-300 hover:border-brand-violet/50 hover:shadow-lg hover:shadow-brand-violet/20">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-gradient-to-br from-brand-violet/30 to-brand-violet/20 p-2">
                      <Clock className="text-brand-violet" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-inactive">Total Hours</div>
                      <div className="text-lg font-semibold text-brand-violet">
                        {totalHours}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="from-success-500/10 to-success-500/5 border-success-500/30 hover:border-success-500/50 hover:shadow-success-500/20 group rounded-2xl border-2 bg-gradient-to-br p-4 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="from-success-500/30 to-success-500/20 rounded-xl bg-gradient-to-br p-2">
                      <CheckCircle className="text-success-500" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-inactive">Attended</div>
                      <div className="text-success-500 text-lg font-semibold">
                        {Array.isArray(trainings) ? trainings.length : 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fitness Test */}
              {fitnessTest && (
                <div className="space-y-4">
                  <h4 className="flex items-center space-x-2 text-lg font-semibold text-contrast">
                    <div className="from-success-500/20 to-success-500/10 rounded-xl bg-gradient-to-br p-2">
                      <Trophy className="text-success-500" size={20} />
                    </div>
                    <span>Fitness Test</span>
                  </h4>
                  <div className="hover:border-success-500/30 rounded-2xl border-2 border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 p-4 transition-all duration-300">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-contrast">
                          Total Score: {fitnessTest.total_score}
                        </div>
                        <div className="text-sm text-inactive">
                          {fitnessTest.grade ? "✅ Passed" : "❌ Not passed"}
                          {fitnessTest.retake && " (Retake)"}
                        </div>
                      </div>
                      <div
                        className={`rounded-xl border px-3 py-1 text-xs font-medium ${
                          fitnessTest.grade
                            ? "from-success-500/20 to-success-500/10 text-success-500 border-success-500/30 bg-gradient-to-r"
                            : "border-red-500/30 bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500"
                        }`}
                      >
                        {fitnessTest.grade ? "Passed" : "Failed"}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {fitnessTest.details.map((exercise, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-contrast">
                              {exercise.exercise}
                            </div>
                            <div className="text-sm text-inactive">
                              {exercise.value} {exercise.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-contrast">
                              {exercise.score}/{exercise.max_score}
                            </div>
                            <div className="relative h-3 w-16 overflow-hidden rounded-2xl border border-secondary/50 bg-gradient-to-r from-secondary/50 to-secondary/30 shadow-inner">
                              <div
                                className="h-full rounded-2xl bg-gradient-to-r from-brand-violet to-brand-violet/80 shadow-lg transition-all duration-500"
                                style={{
                                  width: `${(exercise.score / exercise.max_score) * 100}%`,
                                }}
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
                <h4 className="flex items-center space-x-2 text-lg font-semibold text-contrast">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 p-2">
                    <Calendar className="text-blue-500" size={20} />
                  </div>
                  <span>
                    Training History (
                    {Array.isArray(trainings) ? trainings.length : 0})
                  </span>
                </h4>
                {!Array.isArray(trainings) || trainings.length === 0 ? (
                  <div className="py-8 text-center text-inactive">
                    No training sessions found for this semester
                  </div>
                ) : (
                  <div className="max-h-60 space-y-3 overflow-y-auto">
                    {trainings.map((training, index) => (
                      <div
                        key={training.training_id || index}
                        className="rounded-2xl border-2 border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 p-4 transition-all duration-300 hover:border-blue-500/30 hover:from-blue-500/5 hover:to-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="from-success-500/20 to-success-500/10 rounded-lg bg-gradient-to-br p-1">
                              <CheckCircle
                                size={16}
                                className="text-success-500"
                              />
                            </div>
                            <div>
                              <div className="font-medium text-contrast">
                                {training.sport_name}
                                {training.group_name &&
                                  ` - ${training.group_name}`}
                              </div>
                              <div className="text-sm text-inactive">
                                {training.training_class}
                              </div>
                              <div className="text-xs text-inactive">
                                {formatDate(training.date, training.time)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="rounded-lg bg-brand-violet/10 px-2 py-1 font-medium text-brand-violet">
                              {training.hours}h
                            </div>
                            <div className="text-success-500 text-xs">
                              Completed
                            </div>
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
