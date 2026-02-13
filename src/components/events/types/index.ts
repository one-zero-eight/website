import { workshopsTypes } from "@/api/workshops";
import {
  SchemaHost,
  SchemaWorkshop,
  WorkshopLanguage,
} from "@/api/workshops/types";
import { SchemaClub, SchemaUserWithClubs } from "@/api/clubs/types";
import { GenericBadgeFormScheme } from "../EventEditPage/TagsSelector";

export enum EventCreationType {
  DEFAULT,
  CLUB_LEADER,
}

export interface EventListOptions {
  /** Show "My Check-ins" section above the list (default: true) */
  showMyCheckins?: boolean;
  /** Initial value for "Show previous events" filter (default: false) */
  showPreviousEvents?: boolean;
  /** Filter out drafts and inactive events (default: true) */
  filterDraftsAndInactive?: boolean;
  /** Show edit button on all events (admin) (default: false) */
  isEditable?: boolean;
  /** Club IDs the user leads; events with any of these clubs as host are editable (for club leaders)
   * if empty and admin every even availabel */
  editableClubIds?: string[];
  /** When true, only show drafts that are hosted by one of editableClubIds (non-draft events always shown). For club leaders on admin page. */
  onlyShowDraftsFromEditableClubs?: boolean;
}

export const DEFAULT_EVENT_LIST_OPTIONS: Required<
  Omit<EventListOptions, "editableClubIds">
> & { editableClubIds: string[] } = {
  showMyCheckins: true,
  showPreviousEvents: false,
  filterDraftsAndInactive: true,
  isEditable: false,
  editableClubIds: [],
  onlyShowDraftsFromEditableClubs: false,
};

export type EventLink = {
  id: number;
  title: string;
  url: string;
};

export type EventFormState = Omit<
  workshopsTypes.SchemaWorkshop,
  "id" | "created_at" | "badges" | "links" | "host"
> &
  GenericBadgeFormScheme & {
    host: SchemaHost[];
    date: string;
    check_in_date: string;
    check_in_on_open: boolean;
    links: EventLink[];
    file: File | null;
  };

export interface EventEditFormProps {
  initialEvent?: SchemaWorkshop;
  initialDate?: string;
  clubUser: SchemaUserWithClubs | null | undefined;
  isAdmin?: boolean;
  clubsList?: SchemaClub[];
  onClose?: () => void;
}

export interface EventFormErrors {
  name?: string | null;
  host?: string | null;
  date?: string | null;
  stime?: string | null;
  etime?: string | null;
  links?: string | null;
  checkInLinkError?: string | null;
}

export type SearchFormState = GenericBadgeFormScheme & {
  search?: string;
  selectedLanguages: Record<WorkshopLanguage, boolean>;
  showPreviousEvents: boolean;
  onlyCheckIns: boolean;
  hasPlaces: boolean;
};

export interface EventsListProps {
  events?: SchemaWorkshop[];
  options?: EventListOptions;
  clubUser?: SchemaUserWithClubs;
}

export interface SearchMenuProps {
  searchForm: SearchFormState;
  setSearchForm: React.Dispatch<React.SetStateAction<SearchFormState>>;
  showSearch?: boolean;
}

export interface SearchBarProps {
  searchForm: SearchFormState;
  setSearchForm: (v: SearchFormState) => void;
}

export interface CheckInProps {
  event: SchemaWorkshop;
}

export interface EventItemProps {
  event: workshopsTypes.SchemaWorkshop;
  isEditable: boolean;
  /** When provided, avoids per-item fetch for check-in state (from EventsList). */
  myCheckins?: SchemaWorkshop[];
  /** When provided, avoids per-item fetch for club names (from EventsList). */
  clubsList?: SchemaClub[];
  className?: string;
}

export interface EventForDateProps {
  isoDate: string;
  events: SchemaWorkshop[];
  options?: EventListOptions;
  myCheckins?: SchemaWorkshop[];
  clubsList?: SchemaClub[];
}

export interface ItemsListProps {
  events: SchemaWorkshop[];
  options?: EventListOptions;
  myCheckins?: SchemaWorkshop[];
  clubsList?: SchemaClub[];
  className?: string;
}

export interface LanguageBadgeProps {
  event: SchemaWorkshop;
  className?: string;
}

export interface CheckInButtonProps {
  event: SchemaWorkshop;
  /** When provided, avoids duplicate fetch (e.g. from EventPage). */
  myCheckins?: SchemaWorkshop[];
  className?: string | undefined | null;
}
