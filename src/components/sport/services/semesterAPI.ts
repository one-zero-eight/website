import apiRequest from './api';

export interface Semester {
  id: number;
  name: string;
  start: string;
  end: string;
  hours: number;
}

export const semesterAPI = {
  getSemesters: async (): Promise<Semester[]> => {
    return apiRequest<Semester[]>('/semester');
  },
};
