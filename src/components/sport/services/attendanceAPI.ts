import apiRequest from './api';
import { TrainingGradesResponse, MarkAttendanceRequest, MarkAttendanceResponse, StudentSearchResponse } from './types';

// Attendance API for working with attendance and grades
export const attendanceAPI = {
  /**
   * Download CSV with training grades
   */
  downloadGradesCsv: async (trainingId: number): Promise<Blob> => {
    const response = await fetch(`/trainings/${trainingId}/grades.csv`, {
      method: 'GET'
    });
    return await response.blob();
  },
  /**
   * Get grades for training
   * @param trainingId - Training ID
   */
  getTrainingGrades: async (trainingId: number): Promise<TrainingGradesResponse> => {
    console.log('📊 Getting training grades for training:', trainingId);
    const result = await apiRequest<TrainingGradesResponse>(`/trainings/${trainingId}/grades`);
    console.log('✅ Training grades received:', result);
    return result;
  },

  /**
   * Search students in group
   * @param groupId - Group ID
   * @param term - Search query
   */
  searchStudents: async (groupId: number, term: string): Promise<StudentSearchResponse> => {
    console.log('🔍 Searching students in group:', groupId, 'with term:', term);
    const params = new URLSearchParams({
      group_id: groupId.toString(),
      term,
    });
    const result = await apiRequest<StudentSearchResponse>(`/attendance/students/search?${params.toString()}`);
    console.log('✅ Students search result:', result);


    return result;
  },

  /**
   * Mark student attendance
   * @param data - Attendance data
   */
  markAttendance: async (data: MarkAttendanceRequest): Promise<MarkAttendanceResponse[]> => {
    console.log('✅ Marking attendance:', data);
    const result = await apiRequest<MarkAttendanceResponse[]>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('✅ Attendance marked successfully:', result);
    return result;
  },

}; 