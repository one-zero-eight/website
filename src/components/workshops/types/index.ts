export interface Workshop {
  id: string;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
  remainPlaces?: number;
  isActive?: boolean;
  isRegistrable?: boolean;
}

export interface User {
  id: string;
  innohassle_id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  t_alias?: string;
}

export interface Participant {
  id: string;
  innohassle_id: string;
  role: "admin" | "user";
  email: string;
  t_alias?: string;
}

export interface WorkshopListProps {
  workshops: Workshop[];
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
  currentUserRole: "user" | "admin";
  refreshParticipants: () => void;
}

export interface WorkshopItemProps {
  workshop: Workshop;
  remove: (workshop: Workshop) => void;
  edit: (workshop: Workshop) => void;
  openDescription: (workshop: Workshop) => void;
  currentUserRole: "user" | "admin";
  refreshParticipants: () => void;
}

export interface WorkshopDescriptionProps {
  workshop: Workshop | null;
  refreshTrigger?: number;
  remove?: (workshop: Workshop) => Promise<void>;
  edit?: (workshop: Workshop) => void;
  currentUserRole?: "user" | "admin";
  refreshParticipants?: () => void;
}

export interface PostFormProps {
  create: (workshop: Workshop) => Promise<boolean>;
  initialWorkshop?: Omit<Workshop, "id">;
  isEditing?: boolean;
  onUpdate?: (workshop: Workshop) => void;
  existingId?: string;
  onClose?: () => void;
}

export type WorkshopsByDate<T = Workshop> = {
  [dateString: string]: T[];
};

export type UserRole = "user" | "admin";
