import { useMemo, useState } from "react";
import { groupEvents, hasBadges } from "./event-utils";
import { EventForDate, ItemsList } from "./EventForDate";
import TagsSelector, {
  GenericBadgeFormScheme,
} from "./EventCreationModal/TagsSelector";
import { eventBadges } from "./EventBadges";
import { SchemaWorkshop, WorkshopLanguage } from "@/api/workshops/types";
import { createFuse, searchFuse } from "./search-utils";

export enum EventListType {
  USER,
  ADMIN,
}

export type SearchFormState = GenericBadgeFormScheme & {
  search?: string;
  selectedLanguages: Record<WorkshopLanguage, boolean>;
  showPreviousEvents: boolean;
};

export interface EventsListProps {
  events?: SchemaWorkshop[];
  eventListType?: EventListType;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (workshop: SchemaWorkshop) => void;
}

export function EventsList({
  events = [],
  eventListType = EventListType.USER,
  onAddEvent,
  onEditEvent,
}: EventsListProps) {
  const [searchForm, setSearchForm] = useState<SearchFormState>({
    badges: [],
    selectedLanguages: {
      english: true,
      russian: true,
      both: true,
    },
    showPreviousEvents: false,
  });
  const [showSearch, setShowSearch] = useState(false);

  const fuse = useMemo(
    () => (events.length ? createFuse(events) : null),
    [events],
  );

  const filteredEvents = useMemo(() => {
    if (!events.length) return [];

    let result = events;

    if (searchForm.search && fuse) {
      result = searchFuse(fuse, searchForm.search);
    }

    if (!searchForm.showPreviousEvents) {
      result = result.filter((event) => new Date(event.dtstart) >= new Date());
    }

    return result.filter(
      (event) =>
        searchForm.selectedLanguages[event.language] &&
        hasBadges(event, searchForm.badges),
    );
  }, [events, fuse, searchForm]);

  const groupedEvents = useMemo(
    () => groupEvents(filteredEvents),
    [filteredEvents],
  );

  const hasEvents = events.length > 0;
  const isGroupedView =
    !searchForm.search && Object.keys(groupedEvents).length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3 2xl:grid-cols-4">
      {/* Event List Section */}
      <div className="order-2 col-span-full w-full xl:order-0 xl:col-span-2 2xl:col-span-3">
        {hasEvents ? (
          isGroupedView ? (
            Object.keys(groupedEvents)
              .sort((a, b) => b.localeCompare(a))
              .map((isoDate) => (
                <EventForDate
                  key={isoDate}
                  isoDate={isoDate}
                  events={groupedEvents[isoDate]}
                  eventListType={eventListType}
                  onAddEvent={onAddEvent}
                  onEditEvent={onEditEvent}
                />
              ))
          ) : (
            <ItemsList
              events={filteredEvents}
              onEditEvent={onEditEvent}
              eventListType={eventListType}
            />
          )
        ) : (
          <div className="col-span-full py-10 text-center text-xl">
            <h2 className="text-gray-500">No events found!</h2>
          </div>
        )}
      </div>

      {/* Sidebar Filters */}
      <div className="mt-4 xl:col-span-1 xl:p-4">
        {/* Mobile Filter Toggle */}
        <div className="flex flex-col gap-3 xl:hidden">
          <div className="bg-base-300 flex items-center justify-between rounded-xl p-2">
            <h2 className="text-md ml-2 font-semibold">
              Events ({events.length})
            </h2>
            <button
              className="btn btn-sm flex items-center gap-2"
              onClick={() => setShowSearch((prev) => !prev)}
            >
              <span className="icon-[material-symbols--filter-list]" />
              Filters
            </button>
          </div>

          {showSearch && (
            <div className="bg-base-300 rounded-xl">
              <SearchMenu
                searchForm={searchForm}
                setSearchForm={setSearchForm}
              />
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="card bg-base-200 sticky top-8 mr-1 hidden xl:flex">
          <SearchMenu searchForm={searchForm} setSearchForm={setSearchForm} />
        </div>
      </div>
    </div>
  );
}

export interface SearchMenuProps {
  searchForm: SearchFormState;
  setSearchForm: (v: SearchFormState) => void;
  showSearch?: boolean;
}

export function SearchMenu({
  searchForm,
  setSearchForm,
  showSearch = true,
}: SearchMenuProps) {
  return (
    <>
      <div className="card-body">
        {showSearch && (
          <div className="flex flex-col gap-2">
            <h3 className="text-base-content text-lg font-semibold">Search</h3>
            <SearchBar searchForm={searchForm} setSearchForm={setSearchForm} />
          </div>
        )}
        <TagsSelector<SearchFormState>
          form={searchForm}
          setForm={(v) => setSearchForm(v)}
          maxBadgesAmount={Object.keys(eventBadges).length}
        />
        <div className="divider" />
        <div className="flex flex-col gap-2">
          <h3 className="text-base-content text-xs font-semibold">
            Languages:
          </h3>
          <div className="flex flex-col gap-2">
            {Object.values(WorkshopLanguage).map((language, index) => (
              <label className="label" key={index}>
                <input
                  type="checkbox"
                  className="checkbox rounded-lg"
                  checked={searchForm.selectedLanguages[language]}
                  onChange={() =>
                    setSearchForm({
                      ...searchForm,
                      selectedLanguages: {
                        ...searchForm.selectedLanguages,
                        [language]: !searchForm.selectedLanguages[language],
                      },
                    })
                  }
                />
                {language.charAt(0).toUpperCase() +
                  language.slice(1, language.length)}
              </label>
            ))}
          </div>
          <div className="divider" />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              checked={searchForm.showPreviousEvents}
              onChange={() =>
                setSearchForm({
                  ...searchForm,
                  showPreviousEvents: !searchForm.showPreviousEvents,
                })
              }
            />
            Show previous events
          </label>
        </div>
      </div>
    </>
  );
}

export interface SearchBarProps {
  searchForm: SearchFormState;
  setSearchForm: (v: SearchFormState) => void;
}

export function SearchBar({ searchForm, setSearchForm }: SearchBarProps) {
  return (
    <div className="border-b-inh-secondary-hover focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0">
      <input
        type="text"
        placeholder="Search events..."
        onChange={(e) =>
          setSearchForm({
            ...searchForm,
            search: e.target.value.trim(),
          })
        }
        className="min-w-0 grow bg-transparent px-2 py-1 outline-hidden"
      />
      <span className="icon-[material-symbols--search-rounded] text-inh-secondary-hover shrink-0 text-2xl" />
    </div>
  );
}
