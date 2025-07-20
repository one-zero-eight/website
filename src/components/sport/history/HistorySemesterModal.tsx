import React from 'react';
import SemesterDetailsModal from '../SemesterDetailsModal';
import { StudentSemesterHistory, StudentHistoryTraining, FitnessTestResult } from '../../services/types';

interface HistorySemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: StudentSemesterHistory | null;
  trainings: StudentHistoryTraining[];
  fitnessTest?: FitnessTestResult;
  loading: boolean;
}

const HistorySemesterModal: React.FC<HistorySemesterModalProps> = ({
  isOpen,
  onClose,
  semester,
  trainings,
  fitnessTest,
  loading
}) => {
  return (
    <SemesterDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      semesterName={semester?.semester_name || ''}
      trainings={trainings}
      fitnessTest={fitnessTest}
      loading={loading}
    />
  );
};

export default HistorySemesterModal;
