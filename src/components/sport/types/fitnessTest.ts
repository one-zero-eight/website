export interface FitnessTestSession {
  id: number;
  semester: { name: string } | string;
  date: string;
  teacher: string;
  retake: boolean;
}

export interface FitnessTestResult {
  student: {
    user_id: string;
    name?: string;
    student_info?: { name?: string } | string;
  };
  value: string | number;
}
