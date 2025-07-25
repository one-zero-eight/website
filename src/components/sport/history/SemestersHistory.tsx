import React from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { StudentSemesterHistory } from "../../services/types";

interface SemestersHistoryProps {
  semesterHistory: StudentSemesterHistory[];
  onSemesterClick: (semester: StudentSemesterHistory) => void;
}

const SemestersHistory: React.FC<SemestersHistoryProps> = ({
  semesterHistory,
  onSemesterClick,
}) => {
  return (
    <div className="innohassle-card group border-2 border-secondary/30 bg-gradient-to-br from-floating to-primary/20 p-4 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="mb-4 flex items-center space-x-3">
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-blue-500/10 p-3">
          <Calendar className="text-blue-500" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-contrast">
            Academic History
          </h2>
          <p className="text-inactive">View detailed history by semester</p>
        </div>
      </div>
      <div className="space-y-4">
        {semesterHistory.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 w-fit rounded-2xl bg-gradient-to-br from-inactive/10 to-inactive/5 p-4">
              <Calendar className="text-inactive" size={48} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-contrast">
              No Training History
            </h3>
            <p className="text-inactive">
              You haven't attended any training sessions yet. Check the Schedule
              page to find and enroll in available trainings.
            </p>
          </div>
        ) : (
          semesterHistory.map((semester) => (
            <button
              key={semester.semester_id}
              onClick={() => onSemesterClick(semester)}
              className="group w-full transform rounded-2xl border-2 border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:from-blue-500/5 hover:to-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-blue-500/10 p-3 transition-all duration-300 group-hover:border-blue-500/30">
                    <Calendar className="text-blue-500" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-contrast">
                      {semester.semester_name}
                    </div>
                    <div className="text-sm text-inactive">
                      {new Date(semester.semester_start).toLocaleDateString()} -{" "}
                      {new Date(semester.semester_end).toLocaleDateString()}
                    </div>
                    <div className="mt-1 text-xs text-inactive">
                      {semester.trainings.length} training
                      {semester.trainings.length !== 1 ? "s" : ""} attended
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-contrast">
                      {semester.total_hours} hours
                    </div>
                    <div className="text-sm text-inactive">
                      of {semester.required_hours} required
                    </div>
                    <div
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        semester.total_hours >= semester.required_hours
                          ? "from-success-500/20 to-success-500/10 text-success-500 border-success-500/30 bg-gradient-to-r"
                          : semester.total_hours > 0
                            ? "border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-500"
                            : "border-red-500/30 bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500"
                      }`}
                    >
                      {semester.total_hours >= semester.required_hours
                        ? "Completed"
                        : `${semester.required_hours - semester.total_hours} hours left`}
                    </div>
                  </div>
                  <ChevronRight
                    className="text-inactive transition-colors group-hover:text-blue-500"
                    size={20}
                  />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SemestersHistory;
