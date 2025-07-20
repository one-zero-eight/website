import apiRequest from './api';

export const createFitnessSessionAPI = {
  createSession: async (semester_id: number, retake: boolean = false) => {
    // For creating session we use upload with empty results
    return apiRequest('/fitness-test/upload', {
      method: 'POST',
      body: JSON.stringify({
        semester_id,
        retake,
        results: []
      })
    });
  }
};
