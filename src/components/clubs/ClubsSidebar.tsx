import { clubsTypes } from "@/api/clubs";
import { clubTypesOrder, getClubTypeLabel } from "./utils";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export function ClubsSidebar({
  search,
  setSearch,
  selectedTypes,
  onTypeToggle,
  totalCount,
  mobileFiltersOpen,
  setMobileFiltersOpen,
}: {
  search: string;
  setSearch: (value: string) => void;
  selectedTypes: Set<clubsTypes.ClubType>;
  onTypeToggle: (type: clubsTypes.ClubType) => void;
  totalCount: number;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean) => void;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [readOnly, setReadOnly] = useState(true);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
      setReadOnly(false);
    }
  }, []);

  const sidebarContent = (
    <div className="card-body flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-base-content text-sm font-semibold">Search</h3>
        <div className="border-b-inh-secondary-hover focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            readOnly={readOnly}
            className="min-w-0 grow bg-transparent px-2 py-1 outline-hidden"
          />
          <span className="icon-[material-symbols--search-rounded] text-inh-secondary-hover shrink-0 text-2xl" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base-content text-sm font-semibold">Filters</h3>
        <div className="flex flex-col gap-2">
          {clubTypesOrder.map((type) => (
            <label
              key={type}
              className="text-base-content/70 hover:text-base-content flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedTypes.has(type)}
                onChange={() => onTypeToggle(type)}
                className="checkbox checkbox-sm"
              />
              <span>{getClubTypeLabel(type)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t-inh-secondary-hover border-t pt-4">
        <div className="text-base-content/70 text-sm">
          <span className="font-semibold">{totalCount}</span>{" "}
          {totalCount === 1 ? "club" : "clubs"}
          {search && " found"}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="text-base-content/70 text-sm">
            <span className="font-semibold">{totalCount}</span>{" "}
            {totalCount === 1 ? "club" : "clubs"}
            {search && " found"}
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="btn btn-soft btn-sm"
          >
            <span
              className={clsx(
                "icon-[material-symbols--filter-list] size-4",
                mobileFiltersOpen && "rotate-180",
              )}
            />
            <span>Filters</span>
          </button>
        </div>

        {mobileFiltersOpen && (
          <div className="card card-border bg-base-200">{sidebarContent}</div>
        )}
      </div>

      <aside className="card card-border bg-base-200 sticky top-8 order-2 hidden h-fit w-64 shrink-0 lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
