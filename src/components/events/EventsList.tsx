import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { groupEvents, hasBadges } from "./event-utils";
import { EventForDate, ItemsList } from "./EventForDate";
import TagsSelector, {
  GenericBadgeFormScheme,
} from "./EventEditPage/TagsSelector";
import { eventBadges } from "./EventBadges";
import { SchemaWorkshop, WorkshopLanguage } from "@/api/workshops/types";
import { createFuse, searchFuse } from "./search-utils";
import { $workshops } from "@/api/workshops";
import {
  formatDate,
  formatTime,
  isWorkshopPast,
  parseTime,
} from "./date-utils";
import { LanguageBadge } from "./LanguageBadge";
import { Link } from "@tanstack/react-router";
import { SchemaUserWithClubs } from "@/api/clubs/types";

export enum EventListType {
  USER,
  ADMIN,
  CLUB_LEADER,
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
  onAddEvent?: (date: string) => void;
}

export function EventsList({
  events = [],
  eventListType = EventListType.USER,
  onAddEvent,
}: EventsListProps) {
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");

  const [searchForm, setSearchForm] = useState<SearchFormState>({
    badges: [],
    selectedLanguages: {
      english: true,
      russian: true,
      both: true,
    },
    showPreviousEvents: false,
    onlyCheckIns: false,
    hasPlaces: false,
  });
  const [showSearch, setShowSearch] = useState(false);

  const isCheckedIn = (eventId: string) =>
    !!myCheckins?.some((w) => w.id === eventId);

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

    result = result.filter(
      (event) =>
        event.language &&
        event.dtstart &&
        event.capacity &&
        searchForm.selectedLanguages[event.language] &&
        hasBadges(event, searchForm.badges),
    );

    const now = new Date();
    const upcomingEvents = result.filter(
      (event) => new Date(event.dtstart || "") >= now,
    );
    const pastEvents = result.filter(
      (event) => new Date(event.dtstart || "") < now,
    );

    upcomingEvents.sort(
      (a, b) =>
        new Date(a.dtstart || "").getTime() -
        new Date(b.dtstart || "").getTime(),
    ); // ascending (closest first)
    pastEvents.sort(
      (a, b) =>
        new Date(b.dtstart || "").getTime() -
        new Date(a.dtstart || "").getTime(),
    ); // descending (newest past first)

    if (searchForm.showPreviousEvents) {
      result = [...upcomingEvents, ...pastEvents];
    } else {
      result = upcomingEvents;
    }

    if (searchForm.onlyCheckIns) {
      result = result.filter((event) => isCheckedIn(event.id));
    }

    if (searchForm.hasPlaces) {
      result = result.filter((event) => event.remain_places > 0);
    }

    return result;
  }, [events, fuse, searchForm, isCheckedIn]);

  const groupedEvents = useMemo(
    () => groupEvents(filteredEvents),
    [filteredEvents],
  );

  const userFiltered = useMemo(
    () => filteredEvents.filter((event) => !event.is_draft && event.is_active),
    [filteredEvents],
  );

  const hasEvents = filteredEvents.length > 0;
  const isGroupedView =
    !searchForm.search && Object.keys(groupedEvents).length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3 2xl:grid-cols-4">
      {/* Event List Section */}
      <div
        className={`order-2 col-span-full w-full xl:order-0 xl:col-span-2 xl:mt-5 2xl:col-span-3`}
      >
        {myCheckins && eventListType === EventListType.USER && (
          <div>
            <h2 className="mb-2 text-xl font-semibold">My Check-ins:</h2>
            <div className="mb-5 flex flex-nowrap gap-2 overflow-x-auto">
              {myCheckins
                .sort(
                  (a, b) =>
                    new Date(a.dtstart || "").getTime() -
                    new Date(b.dtstart || "").getTime(),
                )
                .filter((e) => !isWorkshopPast(e.dtstart || ""))
                .map((event) => (
                  <div
                    className="card card-border max-w-[320px] min-w-[320px] text-nowrap"
                    key={event.id}
                  >
                    <div className="card-body flex flex-row items-center justify-between gap-4 rounded-4xl p-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="bg-base-300 flex aspect-square flex-col gap-0.5 rounded-xl p-3 text-center">
                          <span>{formatDate(event.dtstart || "")}</span>
                          <span>
                            {formatTime(parseTime(event.dtstart || ""))}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-semibold text-nowrap">
                            {event.english_name || event.russian_name}
                          </span>
                          <LanguageBadge event={event} />
                        </div>
                      </div>
                      <Link
                        to={`/events/$id`}
                        params={{ id: event.id }}
                        className="btn btn-square mr-3"
                      >
                        <span className="icon-[lucide--move-right]" />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="w-full">
          {hasEvents && userFiltered.length !== 0 ? (
            <div className="w-full">
              {isGroupedView ? (
                (() => {
                  const now = new Date();

                  // Split keys into upcoming & past groups
                  const upcomingDates = Object.keys(groupedEvents).filter(
                    (date) => new Date(date) >= now,
                  );
                  const pastDates = Object.keys(groupedEvents).filter(
                    (date) => new Date(date) < now,
                  );

                  // Sort them properly
                  upcomingDates.sort(
                    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
                  );
                  pastDates.sort(
                    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
                  );

                  // Combine according to toggle
                  const orderedDates = searchForm.showPreviousEvents
                    ? [...upcomingDates, ...pastDates]
                    : upcomingDates;

                  return orderedDates.map((isoDate) => (
                    <EventForDate
                      key={isoDate}
                      isoDate={isoDate}
                      events={groupedEvents[isoDate]}
                      eventListType={eventListType}
                      onAddEvent={onAddEvent}
                    />
                  ));
                })()
              ) : (
                <ItemsList
                  events={filteredEvents}
                  eventListType={eventListType}
                />
              )}
              <span
                className={`text-primary mt-2 cursor-pointer text-center underline select-none ${searchForm.showPreviousEvents && "hidden"}`}
                onClick={() =>
                  setSearchForm({
                    ...searchForm,
                    showPreviousEvents: !searchForm.showPreviousEvents,
                  })
                }
              >
                Show previous events
              </span>
            </div>
          ) : (
            <div className="col-span-full py-10 text-center text-xl">
              <h2 className="text-gray-500">No events found!</h2>
            </div>
          )}
        </div>
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
  setSearchForm: Dispatch<SetStateAction<SearchFormState>>;
  showSearch?: boolean;
}

export function SearchMenu({
  searchForm,
  setSearchForm,
  showSearch = true,
}: SearchMenuProps) {
  const handleChangeLanguage = (language: WorkshopLanguage) => {
    setSearchForm((prev) => {
      const updatedLanguages = {
        ...prev.selectedLanguages,
        [language]: !prev.selectedLanguages[language],
      };

      updatedLanguages[WorkshopLanguage.both] =
        updatedLanguages.english || updatedLanguages.russian;

      return {
        ...prev,
        selectedLanguages: updatedLanguages,
      };
    });
  };

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
            {[WorkshopLanguage.english, WorkshopLanguage.russian].map(
              (language, index) => (
                <label className="label" key={index}>
                  <input
                    type="checkbox"
                    className="checkbox rounded-lg"
                    checked={searchForm.selectedLanguages[language]}
                    onChange={() => handleChangeLanguage(language)}
                  />
                  {language.charAt(0).toUpperCase() +
                    language.slice(1, language.length)}
                </label>
              ),
            )}
          </div>
          <div className="divider" />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              checked={searchForm.onlyCheckIns}
              onChange={() =>
                setSearchForm({
                  ...searchForm,
                  onlyCheckIns: !searchForm.onlyCheckIns,
                })
              }
            />
            Show my check-ins
          </label>
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
          <div className="divider" />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              checked={searchForm.hasPlaces}
              onChange={() =>
                setSearchForm({
                  ...searchForm,
                  hasPlaces: !searchForm.hasPlaces,
                })
              }
            />
            Has places
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
