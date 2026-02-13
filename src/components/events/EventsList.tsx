import { useMemo, useState } from "react";
import { groupEvents, hasBadges } from "./utils";
import { EventForDate, ItemsList } from "./EventForDate";

import { eventBadges } from "./EventBadges";
import {
  HostType,
  SchemaWorkshop,
  WorkshopLanguage,
} from "@/api/workshops/types";
import { createFuse, searchFuse } from "./utils";
import { $clubs } from "@/api/clubs/index.ts";
import { $workshops } from "@/api/workshops";
import { formatDate, formatTime, isWorkshopPast, parseTime } from "./utils";
import { LanguageBadge } from "./LanguageBadge";
import { Link } from "@tanstack/react-router";
import {
  DEFAULT_EVENT_LIST_OPTIONS,
  EventListOptions,
  EventsListProps,
  SearchFormState,
  SearchMenuProps,
  SearchBarProps,
  CheckInProps,
} from "./types";
import type { SchemaClub } from "@/api/clubs/types";
import TagsSelector from "./EventEditPage/TagsSelector";

export function EventsList({
  events = [],
  options: optionsProp,
}: EventsListProps) {
  const options = { ...DEFAULT_EVENT_LIST_OPTIONS, ...optionsProp };
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");
  const { data: clubsList = [] } = $clubs.useQuery("get", "/clubs/");

  const [searchForm, setSearchForm] = useState<SearchFormState>({
    badges: [],
    selectedLanguages: {
      english: true,
      russian: true,
      both: true,
    },
    showPreviousEvents: options.showPreviousEvents,
    onlyCheckIns: false,
    hasPlaces: false,
  });
  const [showSearch, setShowSearch] = useState(false);

  const isCheckedIn = useMemo(
    () => (eventId: string) => !!myCheckins?.some((w) => w.id === eventId),
    [myCheckins],
  );

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

  const displayEvents = useMemo(() => {
    if (
      !options.onlyShowDraftsFromEditableClubs ||
      (options.editableClubIds?.length ?? 0) === 0
    ) {
      return filteredEvents;
    }
    const clubIds = options.editableClubIds ?? [];
    return filteredEvents.filter((event) => {
      if (!event.is_draft) return true;
      const host = event.host ?? [];
      return host.some(
        (h) =>
          (h?.host_type === HostType.club || String(h?.host_type) === "club") &&
          h?.name &&
          clubIds.includes(h.name),
      );
    });
  }, [
    filteredEvents,
    options.onlyShowDraftsFromEditableClubs,
    options.editableClubIds,
  ]);

  const groupedEvents = useMemo(
    () => groupEvents(displayEvents),
    [displayEvents],
  );

  const userFiltered = useMemo(
    () => displayEvents.filter((event) => !event.is_draft && event.is_active),
    [displayEvents],
  );

  const hasEvents = displayEvents.length > 0;
  const isGroupedView =
    !searchForm.search && Object.keys(groupedEvents).length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3 2xl:grid-cols-4">
      {/* Event List Section */}
      <div
        className={`order-2 col-span-full w-full xl:order-0 xl:col-span-2 xl:mt-5 2xl:col-span-3`}
      >
        {myCheckins && options.showMyCheckins && (
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
                .map((event, i) => (
                  <CheckIn event={event} key={i} />
                ))}
            </div>
          </div>
        )}
        <div className="w-full">
          {hasEvents && userFiltered.length !== 0 ? (
            <div className="w-full">
              {isGroupedView ? (
                <GroupedEventsView
                  groupedEvents={groupedEvents}
                  showPreviousEvents={searchForm.showPreviousEvents}
                  options={options}
                  myCheckins={myCheckins}
                  clubsList={clubsList}
                />
              ) : (
                <ItemsList
                  events={displayEvents}
                  options={options}
                  myCheckins={myCheckins}
                  clubsList={clubsList}
                />
              )}
              {!searchForm.showPreviousEvents && (
                <span
                  className="text-primary mt-2 cursor-pointer text-center underline select-none"
                  onClick={() =>
                    setSearchForm({
                      ...searchForm,
                      showPreviousEvents: true,
                    })
                  }
                >
                  Show previous events
                </span>
              )}
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
              (language) => (
                <label className="label" key={language}>
                  <input
                    type="checkbox"
                    className="checkbox rounded-lg"
                    checked={searchForm.selectedLanguages[language]}
                    onChange={() => handleChangeLanguage(language)}
                  />
                  {language.charAt(0).toUpperCase() + language.slice(1)}
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

interface GroupedEventsViewProps {
  groupedEvents: Record<string, SchemaWorkshop[]>;
  showPreviousEvents: boolean;
  options: EventListOptions;
  myCheckins?: SchemaWorkshop[];
  clubsList?: SchemaClub[];
}

function GroupedEventsView({
  groupedEvents,
  showPreviousEvents,
  options,
  myCheckins,
  clubsList,
}: GroupedEventsViewProps) {
  const now = new Date();

  const upcomingDates = Object.keys(groupedEvents).filter(
    (date) => new Date(date) >= now,
  );
  const pastDates = Object.keys(groupedEvents).filter(
    (date) => new Date(date) < now,
  );

  upcomingDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  pastDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const orderedDates = showPreviousEvents
    ? [...upcomingDates, ...pastDates]
    : upcomingDates;

  return (
    <>
      {orderedDates.map((isoDate) => (
        <EventForDate
          key={isoDate}
          isoDate={isoDate}
          events={groupedEvents[isoDate]}
          options={options}
          myCheckins={myCheckins}
          clubsList={clubsList}
        />
      ))}
    </>
  );
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

export function CheckIn({ event }: CheckInProps) {
  return (
    <div
      className="card card-border z-50 max-w-[320px] min-w-[320px] text-nowrap"
      key={event.id}
    >
      <div className="card-body flex flex-row items-center justify-between gap-4 rounded-4xl p-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-base-200 flex min-h-[66px] min-w-[66px] flex-col rounded-xl p-3 text-center">
            <span>{formatDate(event.dtstart || "")}</span>
            <span>{formatTime(parseTime(event.dtstart || ""))}</span>
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
  );
}
