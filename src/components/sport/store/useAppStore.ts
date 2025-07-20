import { create } from 'zustand';
import { Activity } from '../types';
import { StudentProfile } from '../services/types';
import { studentAPI } from '../services/studentAPI';

interface AppState {
  // Basic state
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  
  // User state with full profile
  user: StudentProfile | null;
  isAuthenticated: boolean;
  
  // Enrollment state - shared between ClubPage and SchedulePage
  enrolledSessions: Set<string>;
  
  // Actions
  bookActivity: (activityId: string) => Promise<void>;
  loadActivities: () => Promise<void>;
  clearError: () => void;
  login: () => Promise<void>;
  logout: () => void;
  loadUserProfile: () => Promise<void>;
  
  // Enrollment actions
  enrollInSession: (sessionId: string) => Promise<void>;
  cancelEnrollment: (sessionId: string) => Promise<void>;
  isEnrolled: (sessionId: string) => boolean;
  getEnrollmentCount: () => number;
  canEnrollInMoreSessions: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  activities: [],
  isLoading: false,
  error: null,
  user: null,
  isAuthenticated: true,
  enrolledSessions: new Set<string>(),

  bookActivity: async (activityId: string) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { activities } = get();
    const updatedActivities = activities.map(activity =>
      activity.id === activityId
        ? { ...activity, status: 'booked' as const }
        : activity
    );
    
    set({ activities: updatedActivities, isLoading: false });
  },

  loadActivities: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({ activities: [], isLoading: false });
  },

  clearError: () => set({ error: null }),

  login: async () => {
    set({ isAuthenticated: true });
    await get().loadUserProfile();
  },

  logout: () => set({ 
    isAuthenticated: false, 
    user: null,
    enrolledSessions: new Set<string>() // Clear enrollments on logout
  }),

  // Enrollment actions
  enrollInSession: async (sessionId: string) => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { enrolledSessions } = get();
      const newEnrolledSessions = new Set(enrolledSessions);
      newEnrolledSessions.add(sessionId);
      
      set({ enrolledSessions: newEnrolledSessions });
    } catch (error) {
      set({ error: 'Failed to enroll in session' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelEnrollment: async (sessionId: string) => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { enrolledSessions } = get();
      const newEnrolledSessions = new Set(enrolledSessions);
      newEnrolledSessions.delete(sessionId);
      
      set({ enrolledSessions: newEnrolledSessions });
    } catch (error) {
      set({ error: 'Failed to cancel enrollment' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  isEnrolled: (sessionId: string) => {
    const { enrolledSessions } = get();
    return enrolledSessions.has(sessionId);
  },

  getEnrollmentCount: () => {
    const { enrolledSessions } = get();
    return enrolledSessions.size;
  },

  canEnrollInMoreSessions: () => {
    const { enrolledSessions } = get();
    return enrolledSessions.size < 2; // Maximum 2 sessions per user
  },

  loadUserProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await studentAPI.getProfile();
      set({ user: profile, error: null });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      set({ error: 'Failed to load user profile' });
    } finally {
      set({ isLoading: false });
    }
  },
}));