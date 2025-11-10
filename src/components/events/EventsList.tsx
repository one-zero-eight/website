import { groupEvents, hasBadges } from "./event-utils.ts";
import { EventForDate, EventForDateType } from "./EventForDate.tsx";
import TagsSelector, {
  GenericBadgeFormScheme,
} from "./EventCreationModal/TagsSelector.tsx";
import { useMemo, useState } from "react";
import { eventBadges } from "./EventBadges.tsx";
import { SchemaWorkshop, WorkshopLanguage } from "@/api/workshops/types.ts";
import { createFuse, searchFuse } from "./search-utils.ts";
import { EventItem } from "./EventItem.tsx";

export type SearchFormState = GenericBadgeFormScheme & {
  search?: string;
  selectedLanguages: Record<WorkshopLanguage, boolean>;
};

export interface EventsListProps {
  events: SchemaWorkshop[] | null | undefined;
  eventForDateType?: EventForDateType;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (workshop: SchemaWorkshop) => void;
}

export function EventsList({
  events,
  eventForDateType = EventForDateType.USER,
  ...props
}: EventsListProps) {
  const [searchForm, setSearchForm] = useState<SearchFormState>({
    badges: [],
    selectedLanguages: {
      english: true,
      russian: true,
      both: true,
    },
  });

  const [showSearch, setShowSearch] = useState(false);

  const fuse = useMemo(() => events && createFuse(events), [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let foundEvents: SchemaWorkshop[] = events;
    if (searchForm.search && fuse) {
      foundEvents = searchFuse(fuse, searchForm.search);
    }

    return foundEvents.filter(
      (event) =>
        searchForm.selectedLanguages[event.language] &&
        hasBadges(event, searchForm.badges),
    );
  }, [events, fuse, searchForm]);

  const groupedEvents = useMemo(() => {
    if (!filteredEvents) return {};
    return groupEvents(filteredEvents);
  }, [filteredEvents]);

  return (
    <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3 2xl:grid-cols-4">
      <div className="order-2 col-span-full w-full xl:order-0 xl:col-span-2 2xl:col-span-3">
        {events && groupedEvents ? (
          !searchForm.search && Object.keys(groupedEvents).length > 0 ? (
            Object.keys(groupedEvents)
              .sort((a: string, b: string) => b.localeCompare(a))
              .map((tagName, index) => (
                <EventForDate
                  key={index}
                  isoDate={tagName}
                  events={groupedEvents[tagName]}
                  eventForDateType={eventForDateType}
                  {...props}
                />
              ))
          ) : (
            <div className="my-4 grid w-full grid-cols-1 gap-5 @lg/content:grid-cols-1 @5xl/content:grid-cols-2 @7xl/content:grid-cols-3">
              {filteredEvents.map((event: SchemaWorkshop) => (
                <EventItem
                  key={event.id}
                  event={event}
                  edit={
                    eventForDateType === EventForDateType.ADMIN
                      ? () =>
                          props.onEditEvent ? props.onEditEvent(event) : null
                      : null
                  }
                />
              ))}
            </div>
          )
        ) : (
          <div className="col-span-full mt-10 text-center text-xl">
            <h2 className="text-gray-500">No events yet!</h2>
          </div>
        )}
      </div>
      <div className="mt-4 xl:col-span-1 xl:p-4">
        <div className="flex flex-col gap-3 xl:hidden">
          <div className="bg-base-300 flex items-center justify-between rounded-xl p-2">
            <h2 className="text-md ml-2 font-semibold">
              Events ({events?.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                <span className="icon-[material-symbols--filter-list]" />
                Filters
              </button>
            </div>
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
