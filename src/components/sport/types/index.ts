export interface Activity {
  id: string;
  activity: string;
  time: string;
  dayOfWeek: string;
  date: Date;
  status: 'free' | 'booked' | 'past';
  maxParticipants: number;
  currentParticipants: number;
  isPast: boolean;
  isRegistrationOpen: boolean;
  groupId: number;
  trainingId: number;
}