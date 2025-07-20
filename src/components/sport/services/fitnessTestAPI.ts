import apiRequest from './api';

export interface FitnessTestSession {
  id: number;
  semester: {
    id: number;
    name: string;
    start: string;
    end: string;
    hours: number;
  };
  retake: boolean;
  date: string;
  teacher: string;
}

export interface FitnessTestExercise {
  id: number;
  name: string;
  unit: string;
  select?: string[];
}

export interface FitnessTestSessionDetails {
  session: FitnessTestSession;
  exercises: FitnessTestExercise[];
  results: Record<string, Array<{
    student: any;
    value: number;
  }>>;
}

export interface FitnessTestStudentSuggestion {
  value: string;
  label: string;
}

export const fitnessTestAPI = {
  getSessions: async (): Promise<FitnessTestSession[]> => {
    return apiRequest<FitnessTestSession[]>('/fitness-test/sessions');
  },
  getSessionDetails: async (sessionId: number): Promise<FitnessTestSessionDetails> => {
    return apiRequest<FitnessTestSessionDetails>(`/fitness-test/sessions/${sessionId}`);
  },
  searchStudents: async (term: string): Promise<FitnessTestStudentSuggestion[]> => {
    return apiRequest<FitnessTestStudentSuggestion[]>(`/fitness-test/students/search?term=${encodeURIComponent(term)}`);
  },
  uploadResults: async (sessionId: number, payload: { semester_id: number, retake: boolean, results: Array<{ student_id: string | number, exercise_id: number, value: string }> }) => {
    return apiRequest(`/fitness-test/upload/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
}; 