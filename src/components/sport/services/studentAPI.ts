import apiRequest from './api';
import { WeeklyScheduleResponse, StudentProfile, FitnessTestResult, StudentSemesterHistory, StudentMeasurementResponse, MedicalReferenceUploadResponse, SelfSportUploadResponse } from './types';

// Student API for new endpoints
export const studentAPI = {
  /**
   * Get current student profile information
   */
  getProfile: async (): Promise<StudentProfile> => {
    console.log('👤 Getting student profile...');
    const result = await apiRequest<StudentProfile>('/student/profile');
    console.log('✅ Student profile received:', result);
    return result;
  },


  /**
   * Get weekly schedule with participants information for each training
   * @param start - Start date
   * @param end - End date
   */
  getWeeklySchedule: async (start: Date, end: Date): Promise<WeeklyScheduleResponse> => {
    // Format date as YYYY-MM-DDTHH:mm:ss (local time)
    function toLocalISOString(date: Date, endOfDay = false) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (endOfDay) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T23:59:59`;
      }
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    const params = new URLSearchParams({
      start: toLocalISOString(start),
      end: toLocalISOString(end, true),
    });
    const endpoint = `/student/weekly-schedule?${params.toString()}`;
    console.log('🔗 Making API call to:', endpoint);
    console.log('📅 Date parameters:', {
      start: toLocalISOString(start),
      end: toLocalISOString(end, true)
    });
    const result = await apiRequest<WeeklyScheduleResponse>(endpoint);
    console.log('✅ API call successful, received:', result.length, 'trainings');
    return result;
  },

  /**
   * Check in to a training
   * @param trainingId - Training ID
   */
  checkIn: async (trainingId: number): Promise<void> => {
    console.log('✅ Checking in to training:', trainingId);
    await apiRequest<void>(`/trainings/${trainingId}/check-in`, {
      method: 'POST',
    });
    console.log('✅ Successfully checked in to training:', trainingId);
  },

  /**
   * Cancel check-in from a training
   * @param trainingId - Training ID
   */
  cancelCheckIn: async (trainingId: number): Promise<void> => {
    console.log('❌ Canceling check-in from training:', trainingId);
    await apiRequest<void>(`/trainings/${trainingId}/cancel-check-in`, {
      method: 'POST',
    });
    console.log('✅ Successfully canceled check-in from training:', trainingId);
  },

  /**
   * Upload medical reference
   * @param image - The medical reference image file
   * @param startDate - Start date of illness period
   * @param endDate - End date of illness period
   * @param studentComment - Optional comment from student
   */
  uploadMedicalReference: async (
    image: File,
    startDate: string,
    endDate: string,
    studentComment?: string
  ): Promise<MedicalReferenceUploadResponse> => {
    console.log('📋 Uploading medical reference...');
    
    const formData = new FormData();
    formData.append('image', image);
    formData.append('start', startDate);
    formData.append('end', endDate);
    if (studentComment) {
      formData.append('student_comment', studentComment);
    }
    
    const result = await apiRequest<MedicalReferenceUploadResponse>('/references/upload', {
      method: 'POST',
      body: formData,
      // Don't set headers for FormData - browser will add multipart/form-data automatically
    });
    
    console.log('✅ Medical reference uploaded successfully');
    return result;
  },

  /**
   * Get student measurements
   * @param studentId - Student ID
   */
  getStudentMeasurements: async (studentId: number): Promise<StudentMeasurementResponse> => {
    console.log('📏 Getting student measurements for ID:', studentId);
    const result = await apiRequest<StudentMeasurementResponse>(`/measurements/student/${studentId}`);
    console.log('✅ Student measurements received:', result);
    return result;
  },

  /**
   * Get fitness test results
   */
  getFitnessTestResults: async (): Promise<FitnessTestResult[]> => {
    console.log('🏃 Getting fitness test results...');
    const result = await apiRequest<FitnessTestResult[]>('/fitness-test/result');
    console.log('✅ Fitness test results received:', result);
    return result;
  },

  /**
   * Get student semester history with trainings
   * Returns only semesters where student has attended trainings
   */
  getSemesterHistory: async (): Promise<StudentSemesterHistory[]> => {
    console.log('📚 Getting student semester history...');
    const result = await apiRequest<StudentSemesterHistory[]>('/student/semester-history');
    console.log('✅ Student semester history received:', result);
    
    // Filter out semesters with no trainings
    const semestersWithTrainings = result.filter(semester => semester.trainings && semester.trainings.length > 0);
    console.log('🔍 Filtered to semesters with trainings:', semestersWithTrainings.length, 'out of', result.length);
    
    return result;
  },

  /**
   * Get student performance percentile
   */
  getStudentPercentile: async (studentId: string): Promise<number> => {
    console.log('📈 Getting student percentile for ID:', studentId);
    const result = await apiRequest<number>(`/students/${studentId}/better-than`);
    console.log('✅ Student percentile received:', result);
    return result;
  },

  /**
   * Upload self-sport activity
   * @param link - Link to Strava, TrainingPeaks, or similar platform
   * @param hours - Number of hours
   * @param trainingType - Training type ID
   * @param studentComment - Optional comment from student
   * @param parsedData - Optional parsed data
   */
  uploadSelfSportActivity: async (
    link: string,
    hours: number,
    trainingType: number,
    studentComment?: string,
    parsedData?: any
  ): Promise<SelfSportUploadResponse> => {
    console.log('🏃 Uploading self-sport activity...');
    
    const formData = new FormData();
    formData.append('link', link);
    formData.append('hours', hours.toString());
    formData.append('training_type', trainingType.toString());
    if (studentComment) {
      formData.append('student_comment', studentComment);
    }
    if (parsedData) {
      formData.append('parsed_data', JSON.stringify(parsedData));
    }
    
    const result = await apiRequest<SelfSportUploadResponse>('/selfsport/upload', {
      method: 'POST',
      body: formData,
    });
    
    console.log('✅ Self-sport activity uploaded successfully');
    return result;
  }
};
