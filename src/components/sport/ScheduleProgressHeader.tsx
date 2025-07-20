import React from "react";

import { studentService } from "./services/studentService";

interface ScheduleProgressHeaderProps {
  studentProfile: any;
  studentProgress: {
    completedHours: number;
    totalHours: number;
    progressPercentage: number;
    debt: number;
    selfSportHours: number;
    isComplete: boolean;
  } | null;
  studentPercentile: number | null;
}

const ScheduleProgressHeader: React.FC<ScheduleProgressHeaderProps> = ({
  studentProfile,
  studentProgress,
  studentPercentile,
}) => {
  const isLoading =
    !studentProfile ||
    !studentProgress ||
    typeof studentPercentile !== "number";
  if (isLoading) {
    return (
      <div className="innohassle-card relative flex min-h-[180px] items-center justify-center overflow-hidden border-2 border-brand-violet/20 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 p-4 shadow-lg shadow-brand-violet/5 transition-all duration-300 hover:border-brand-violet/30 sm:p-6">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-violet" />
      </div>
    );
  }
  return (
    <div className="innohassle-card relative overflow-hidden border-2 border-brand-violet/20 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 p-4 shadow-lg shadow-brand-violet/5 transition-all duration-300 hover:border-brand-violet/30 sm:p-6">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-brand-violet/10 to-transparent blur-3xl"></div>
      <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-12 translate-y-12 rounded-full bg-gradient-to-tr from-brand-violet/10 to-transparent blur-2xl"></div>
      <div className="relative text-center">
        <div className="mb-4">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-violet to-brand-violet/80">
              <span className="text-lg font-bold text-white">🏃</span>
            </div>
          </div>
          <h2 className="mb-2 bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-2xl font-bold text-contrast text-transparent sm:text-3xl">
            {studentProfile &&
            studentProfile.student_info &&
            studentProfile.student_info.name
              ? `${studentProfile.student_info.name}'s Sport Progress`
              : ""}
          </h2>
          {/* Trainer Information */}
          {studentProfile && studentService.isTrainer(studentProfile) && (
            <div className="mb-4">
              <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 shadow-lg">
                <span className="text-lg">👨‍🏫</span>
                <span className="text-sm font-semibold text-white">
                  Teacher
                </span>
              </div>
              {studentProfile.trainer_info &&
                studentProfile.trainer_info.groups &&
                studentProfile.trainer_info.groups.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-inactive">
                      Teaching groups:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {studentProfile.trainer_info.groups.map(
                        (group: { id: number; name: string }) => (
                          <div
                            key={group.id}
                            className="inline-flex items-center space-x-1 rounded-full border border-secondary/50 bg-gradient-to-r from-secondary/50 to-secondary/30 px-3 py-1"
                          >
                            <span className="text-xs">🏃</span>
                            <span className="text-xs font-medium text-contrast">
                              {group.name}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
          {studentProfile &&
            (studentProfile.student_info?.medical_group ||
              studentProfile.medical_group) && (
              <div className="mb-3">
                <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-brand-violet to-brand-violet/80 px-3 py-1">
                  <span className="text-sm">🏥</span>
                  <span className="text-sm font-medium text-white">
                    {studentProfile.student_info?.medical_group ||
                      studentProfile.medical_group}
                  </span>
                </div>
              </div>
            )}
          <p className="text-sm text-inactive sm:text-base">
            You've completed{" "}
            <span className="font-semibold text-brand-violet">
              {studentProgress.completedHours}
            </span>{" "}
            out of{" "}
            <span className="font-semibold text-contrast">
              {studentProgress.totalHours}
            </span>{" "}
            required hours this semester
            {studentProgress.completedHours > studentProgress.totalHours && (
              <span className="text-success-500 mt-1 block font-medium">
                🎉 Exceeded requirement by{" "}
                {studentProgress.completedHours - studentProgress.totalHours}{" "}
                hours!
              </span>
            )}
          </p>
        </div>
        {/* Progress bar, legend, statistics and motivation */}
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between text-xs text-inactive sm:text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-brand-violet"></div>
              <span className="font-semibold">
                {studentProgress.completedHours} of {studentProgress.totalHours}{" "}
                hours
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-secondary"></div>
              <span className="font-medium">
                {studentProgress.completedHours >= studentProgress.totalHours
                  ? `+${studentProgress.completedHours - studentProgress.totalHours} extra`
                  : `${studentProgress.totalHours - studentProgress.completedHours} remaining`}
              </span>
            </div>
          </div>
          <div className="relative w-full py-1">
            <div className="relative h-8 w-full overflow-hidden rounded-2xl border border-secondary/50 bg-gradient-to-r from-secondary/50 to-secondary/30 shadow-inner">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
              {/* Main hours */}
              {(() => {
                const regularHours = Math.max(
                  0,
                  studentProgress.completedHours -
                    studentProgress.selfSportHours,
                );
                const regularPercentage = Math.min(
                  (regularHours / studentProgress.totalHours) * 100,
                  100,
                );
                return (
                  regularPercentage > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full rounded-l-2xl bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-out"
                      style={{ width: `${regularPercentage}%` }}
                    >
                      <div className="absolute inset-0 -skew-x-12 transform animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>
                  )
                );
              })()}
              {/* Self-sport hours */}
              {(() => {
                const regularHours = Math.max(
                  0,
                  studentProgress.completedHours -
                    studentProgress.selfSportHours,
                );
                const regularPercentage = Math.min(
                  (regularHours / studentProgress.totalHours) * 100,
                  100,
                );
                const selfSportPercentage = Math.min(
                  (studentProgress.selfSportHours /
                    studentProgress.totalHours) *
                    100,
                  100 - regularPercentage,
                );
                return (
                  selfSportPercentage > 0 && (
                    <div
                      className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                      style={{
                        left: `${regularPercentage}%`,
                        width: `${selfSportPercentage}%`,
                        borderRadius:
                          regularPercentage === 0 ? "1rem 0 0 1rem" : "0",
                      }}
                    >
                      <div className="absolute inset-0 -skew-x-12 transform animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>
                  )
                );
              })()}
              {/* Exceeding requirement */}
              {(() => {
                const excessPercentage =
                  studentProgress.completedHours > studentProgress.totalHours
                    ? Math.min(
                        ((studentProgress.completedHours -
                          studentProgress.totalHours) /
                          studentProgress.totalHours) *
                          100,
                        50,
                      )
                    : 0;
                return (
                  excessPercentage > 0 && (
                    <div
                      className="absolute top-0 h-full animate-pulse rounded-r-2xl bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-1000 ease-out"
                      style={{
                        left: "100%",
                        width: `${excessPercentage}%`,
                        transform: "translateX(-100%)",
                      }}
                    >
                      <div className="absolute inset-0 -skew-x-12 transform animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                    </div>
                  )
                );
              })()}
              {/* Debt (if any) */}
              {studentProgress.debt > 0 && (
                <div
                  className="absolute right-0 top-0 h-full rounded-r-2xl border-2 border-red-400 bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min((studentProgress.debt / studentProgress.totalHours) * 100, 30)}%`,
                  }}
                >
                  <div className="absolute inset-0 -skew-x-12 transform animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
              )}
              {/* Milestone markers */}
              <div className="absolute inset-0 flex items-center overflow-hidden rounded-2xl">
                {[25, 50, 75, 100].map((milestone) => (
                  <div
                    key={milestone}
                    className="absolute bottom-0 top-0 w-0.5 bg-white/40"
                    style={{ left: `${milestone}%` }}
                  >
                    <div className="absolute -top-3 left-1/2 h-2 w-2 -translate-x-1/2 transform rounded-full bg-white/60"></div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 transform text-xs font-medium text-inactive">
                      {milestone}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Progress Stats */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {studentProgress &&
            typeof studentProgress.progressPercentage === "number" && (
              <div className="flex items-center space-x-2 rounded-xl border border-brand-violet/20 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 px-4 py-2">
                <span className="text-lg">😁</span>
                <span className="text-sm font-bold text-contrast">
                  {studentProgress.progressPercentage.toFixed(1)}% Complete
                </span>
              </div>
            )}
          {studentProgress.debt > 0 && (
            <div className="flex items-center space-x-2 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-orange-500/5 px-4 py-2">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-bold text-orange-500">
                {studentProgress.debt} Hours Debt
              </span>
            </div>
          )}
          {studentProgress.progressPercentage >= 100 && (
            <div className="flex animate-bounce items-center space-x-2 rounded-xl border border-brand-violet/30 bg-gradient-to-r from-brand-violet/20 to-brand-violet/10 px-4 py-2">
              <span className="text-lg">🏆</span>
              <span className="text-sm font-bold text-brand-violet">
                Goal Achieved!
              </span>
            </div>
          )}
          {studentProgress.selfSportHours > 0 && (
            <div className="flex items-center space-x-2 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-blue-500/5 px-4 py-2">
              <span className="text-lg">🏋️</span>
              <span className="text-sm font-bold text-blue-500">
                {studentProgress.selfSportHours} Self-Sport Hours
              </span>
            </div>
          )}
          {typeof studentPercentile === "number" && (
            <div className="from-success-500/10 to-success-500/5 border-success-500/20 flex items-center space-x-2 rounded-xl border bg-gradient-to-r px-4 py-2">
              <span className="text-lg">🎯</span>
              <span className="text-success-500 text-sm font-bold">
                Top {studentPercentile}% Performer
              </span>
            </div>
          )}
          {studentProgress &&
            typeof studentProgress.progressPercentage === "number" &&
            studentProgress.progressPercentage >= 100 && (
              <div className="flex animate-bounce items-center space-x-2 rounded-xl border border-brand-violet/30 bg-gradient-to-r from-brand-violet/20 to-brand-violet/10 px-4 py-2">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-bold text-brand-violet">
                  Goal Achieved!
                </span>
              </div>
            )}
        </div>
        {/* Motivational Message */}
        <div className="mt-4 text-center">
          <p className="text-sm text-inactive">
            {studentProgress.progressPercentage >= 100
              ? "Congratulations! You've completed all required hours!"
              : studentProgress.progressPercentage >= 75
                ? "You're almost there! Keep it up!"
                : studentProgress.progressPercentage >= 50
                  ? "Great progress! You're halfway there!"
                  : studentProgress.progressPercentage >= 25
                    ? "Good start! Keep building momentum!"
                    : "Let's get started on your fitness journey!"}
          </p>
          {studentProgress.progressPercentage < 100 && (
            <p className="mt-1 text-xs text-inactive">
              Estimated time to completion:{" "}
              {Math.ceil(
                Math.max(
                  studentProgress.totalHours - studentProgress.completedHours,
                  0,
                ) / 2,
              )}{" "}
              weeks
            </p>
          )}
          {studentProgress.progressPercentage >= 100 &&
            studentProgress.completedHours > studentProgress.totalHours && (
              <p className="text-success-500 mt-1 text-xs font-medium">
                You've exceeded the requirement by{" "}
                {studentProgress.completedHours - studentProgress.totalHours}{" "}
                hours! 🌟
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleProgressHeader;
