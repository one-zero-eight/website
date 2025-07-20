import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { StudentSemesterHistory } from '../../services/types';

interface SemestersHistoryProps {
  semesterHistory: StudentSemesterHistory[];
  onSemesterClick: (semester: StudentSemesterHistory) => void;
}

const SemestersHistory: React.FC<SemestersHistoryProps> = ({ semesterHistory, onSemesterClick }) => {
  return (
    <div className="group innohassle-card p-4 bg-gradient-to-br from-floating to-primary/20 border-2 border-secondary/30 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl border border-blue-500/20">
          <Calendar className="text-blue-500" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-contrast">Academic History</h2>
          <p className="text-inactive">View detailed history by semester</p>
        </div>
      </div>
      <div className="space-y-4">
        {semesterHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gradient-to-br from-inactive/10 to-inactive/5 rounded-2xl w-fit mx-auto mb-4">
              <Calendar className="text-inactive" size={48} />
            </div>
            <h3 className="text-lg font-semibold text-contrast mb-2">No Training History</h3>
            <p className="text-inactive">
              You haven't attended any training sessions yet. 
              Check the Schedule page to find and enroll in available trainings.
            </p>
          </div>
        ) : (
          semesterHistory.map((semester) => (
            <button
              key={semester.semester_id}
              onClick={() => onSemesterClick(semester)}
              className="w-full bg-gradient-to-r from-primary/50 to-secondary/30 border-2 border-secondary/50 rounded-2xl p-4 hover:border-blue-500/50 hover:from-blue-500/5 hover:to-blue-500/10 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/30 transition-all duration-300">
                    <Calendar className="text-blue-500" size={20} />
                  </div>
                  <div>
                    <div className="text-contrast font-semibold">{semester.semester_name}</div>
                    <div className="text-inactive text-sm">
                      {new Date(semester.semester_start).toLocaleDateString()} - {new Date(semester.semester_end).toLocaleDateString()}
                    </div>
                    <div className="text-inactive text-xs mt-1">
                      {semester.trainings.length} training{semester.trainings.length !== 1 ? 's' : ''} attended
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-contrast font-semibold">{semester.total_hours} hours</div>
                    <div className="text-inactive text-sm">
                      of {semester.required_hours} required
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-lg border ${
                      semester.total_hours >= semester.required_hours 
                        ? 'bg-gradient-to-r from-success-500/20 to-success-500/10 text-success-500 border-success-500/30' 
                        : semester.total_hours > 0 
                          ? 'bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-500 border-orange-500/30' 
                          : 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500 border-red-500/30'
                    }`}>
                      {semester.total_hours >= semester.required_hours 
                        ? 'Completed' 
                        : `${semester.required_hours - semester.total_hours} hours left`}
                    </div>
                  </div>
                  <ChevronRight 
                    className="text-inactive group-hover:text-blue-500 transition-colors" 
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
