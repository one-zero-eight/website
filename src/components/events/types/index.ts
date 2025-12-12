import { workshopsTypes } from "@/api/workshops";
import { SchemaWorkshop, WorkshopLanguage } from "@/api/workshops/types";
import { SchemaUserWithClubs } from "@/api/clubs/types";
import { GenericBadgeFormScheme } from "../EventEditPage/TagsSelector";

export enum EventCreationType {
  DEFAULT,
  CLUB_LEADER,
}

export enum EventListType {
  USER,
  ADMIN,
  CLUB_LEADER,
}

export type EventLink = {
  id: number;
  title: string;
  url: string;
};

export type EventFormState = Omit<
  workshopsTypes.SchemaWorkshop,
  "id" | "created_at" | "badges" | "links"
> &
  GenericBadgeFormScheme & {
    date: string;
    check_in_date: string;
    check_in_on_open: boolean;
    links: EventLink[];
    file: File | null;
  };

export interface CreationFormProps {
  initialEvent?: SchemaWorkshop;
  initialDate?: string;
  clubUser: SchemaUserWithClubs | null | undefined;
  isAdmin?: boolean;
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
  eventListType?: EventListType;
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
  className?: string;
}

export interface EventForDateProps {
  isoDate: string;
  events: SchemaWorkshop[];
  eventListType?: EventListType;
}

export interface ItemsListProps {
  events: SchemaWorkshop[];
  eventListType?: EventListType;
  className?: string;
}

export interface LanguageBadgeProps {
  event: SchemaWorkshop;
  className?: string;
}

export interface CheckInButtonProps {
  event: SchemaWorkshop;
  className?: string | undefined | null;
}
