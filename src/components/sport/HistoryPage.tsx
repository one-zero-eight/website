import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { studentAPI } from '../services/studentAPI';
import { FitnessTestResult, StudentHistoryTraining, StudentSemesterHistory } from '../services/types';
import HistorySemesterModal from '../components/history/HistorySemesterModal';
// import FitnessTestsHistory from '../components/history/FitnessTestsHistory';
import SemestersHistory from '../components/history/SemestersHistory';

const HistoryPage: React.FC = () => {
  const [fitnessTests, setFitnessTests] = useState<FitnessTestResult[]>([]);
  const [semesterHistory, setSemesterHistory] = useState<StudentSemesterHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedSemester, setSelectedSemester] = useState<StudentSemesterHistory | null>(null);
  const [modalTrainings, setModalTrainings] = useState<StudentHistoryTraining[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fitnessData, semesterHistoryData] = await Promise.all([
        studentAPI.getFitnessTestResults(),
        studentAPI.getSemesterHistory()
      ]);
      setFitnessTests(fitnessData);
      setSemesterHistory(semesterHistoryData);

      // Remove filtering: display all semesters, even if trainings: []
      // setAllSemesters is no longer needed
    } catch (err) {
      // Error loading history data
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterClick = async (semester: StudentSemesterHistory) => {
    try {
      setSelectedSemester(semester);
      setModalLoading(true);

      // Use trainings from semester history data directly
      setModalTrainings(semester.trainings);
    } catch (err) {
      // Error loading semester details
      setModalTrainings([]);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSemester(null);
    setModalTrainings([]);
  };

  if (loading) {
    return (
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="innohassle-card p-6 bg-gradient-to-br from-floating to-primary/20 border-2 border-secondary/30">
            <div className="text-center">
              <div className="p-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl w-fit mx-auto mb-4">
                <Loader2 className="animate-spin text-brand-violet" size={32} />
              </div>
              <p className="text-inactive">Loading your training history...</p>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="max-w-7xl mx-auto">
          <div className="innohassle-card p-6 text-center bg-gradient-to-br from-floating to-primary/20 border-2 border-red-500/30">
            <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-2xl w-fit mx-auto mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <p className="text-red-500 mb-4">Error loading data: {error}</p>
            <button
                onClick={loadData}
                className="px-6 py-3 bg-gradient-to-r from-brand-violet to-brand-violet/80 text-white rounded-xl hover:from-brand-violet/80 hover:to-brand-violet/60 transition-all duration-300 font-medium shadow-lg hover:shadow-brand-violet/25"
            >
              Try Again
            </button>
          </div>
        </div>
    );
  }

  // For statistics block we always take the last semester from semesterHistory
  const currentSemester = semesterHistory.length > 0 ? semesterHistory[semesterHistory.length - 1] : undefined;
  const currentFitnessTest = fitnessTests.find(test => test.semester === currentSemester?.semester_name);

  return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden innohassle-card p-4 sm:p-6 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 border-2 border-brand-violet/20 hover:border-brand-violet/30 transition-all duration-300 shadow-lg shadow-brand-violet/5">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-contrast">Training History</h1>
            <p className="text-inactive mt-2">Your training progress and achievements</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-violet/10 to-transparent rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-brand-violet/10 to-transparent rounded-full blur-xl"></div>
        </div>

        {/* Current semester statistics */}
        {currentSemester && (
            <div className="group innohassle-card p-4 bg-gradient-to-br from-floating to-primary/20 border-2 border-secondary/30 hover:border-success-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-success-500/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-success-500/20 to-success-500/10 rounded-xl border border-success-500/20 flex items-center justify-center" style={{minWidth:48, minHeight:48}}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy text-success-500" style={{display:'block'}}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M17 17a5 5 0 0 1-10 0"/><path d="M17 3V2a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1"/><path d="M4 6a8 8 0 0 0 16 0"/><path d="M4 6V3a1 1 0 0 1 1-1h1"/><path d="M20 6V3a1 1 0 0 0-1-1h-1"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-contrast">Current Semester</h2>
                  <p className="text-inactive">Statistics for {currentSemester.semester_name || '—'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-inactive">Total Hours</div>
                    <div className="text-lg font-semibold text-brand-violet">{currentSemester.total_hours}</div>
                  </div>
                  <div>
                    <div className="text-sm text-inactive">Attended Trainings</div>
                    <div className="text-lg font-semibold text-success-500">{currentSemester.trainings.length}</div>
                  </div>
                </div>
                {/* All trainings for the current semester */}
                {currentSemester.trainings && currentSemester.trainings.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-contrast mb-2">Trainings</h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {currentSemester.trainings.map((training, idx) => (
                            <div key={training.training_id || idx} className="bg-gradient-to-r from-primary/50 to-secondary/30 border-2 border-secondary/50 rounded-2xl p-4 hover:border-blue-500/30 hover:from-blue-500/5 hover:to-blue-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="bg-gradient-to-br from-success-500/20 to-success-500/10 rounded-lg flex items-center justify-center" style={{minWidth:45, minHeight:45, width:45, height:45}}>
                                    <span className="text-success-500 font-bold text-2xl" style={{display:'block', minWidth:28, textAlign:'center', lineHeight:'45px'}}>✓</span>
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
                                      {training.date} {training.time}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-brand-violet font-medium bg-brand-violet/10 px-2 py-1 rounded-lg">{training.hours}h</div>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}
                {currentFitnessTest && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-contrast">Fitness Test:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${currentFitnessTest.grade ? 'bg-gradient-to-r from-success-500/20 to-success-500/10 text-success-500 border-success-500/30' : 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500 border-red-500/30'}`}>{currentFitnessTest.grade ? 'Passed' : 'Failed'}</span>
                        {currentFitnessTest.retake && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-500 border border-orange-500/30">Retake</span>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-contrast">{currentFitnessTest.total_score}</div>
                      <div className="text-sm text-inactive mb-2">Total Score</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentFitnessTest.details.map((exercise, exerciseIndex) => (
                            <div key={exerciseIndex} className="bg-gradient-to-br from-primary/30 to-secondary/20 border border-secondary/50 rounded-xl p-4 hover:border-brand-violet/30 transition-all duration-300">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-contrast font-medium">{exercise.exercise}</div>
                                <div className="text-sm text-brand-violet font-medium bg-brand-violet/10 px-2 py-1 rounded-lg">{exercise.score}/{exercise.max_score}</div>
                              </div>
                              <div className="text-sm text-inactive mb-3">{exercise.value} {exercise.unit}</div>
                              <div className="w-full bg-gradient-to-r from-secondary/50 to-secondary/30 rounded-2xl h-3 shadow-inner border border-secondary/50 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-brand-violet to-brand-violet/80 h-full rounded-2xl transition-all duration-500 shadow-lg" style={{ width: `${(exercise.score / exercise.max_score) * 100}%` }} />
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* Semesters */}
        <SemestersHistory semesterHistory={semesterHistory} onSemesterClick={handleSemesterClick} />

        {/* Modal */}
        <HistorySemesterModal
            isOpen={selectedSemester !== null}
            onClose={closeModal}
            semester={selectedSemester}
            trainings={modalTrainings}
            fitnessTest={fitnessTests.find(test => test.semester === selectedSemester?.semester_name)}
            loading={modalLoading}
        />
      </div>
  );
};

export default HistoryPage;