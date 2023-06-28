"use client";
import ScheduleDialog from "@/components/ScheduleDialog";
import { Categories, Schedule } from "@/lib/schedule/api";
import { ymEvent } from "@/lib/tracking/YandexMetrika";
import { useState } from "react";
import CategoriesDropdown from "./CategoriesDropdown";
import FilterDropdown from "./FilterDropdown";
import ScheduleElement from "./ScheduleElement";

export type ScheduleListProps = {
  categories: Categories;
  schedule: Schedule;
  category: string;
};

export default function ScheduleList({
  categories,
  schedule,
  category,
}: ScheduleListProps) {
  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {}
  );
  const [search, setSearch] = useState("");
  const [selectedGroupFile, setSelectedGroupFile] = useState("");
  const [dialogOpened, setDialogOpened] = useState(false);

  // Apply filters
  const calendars = schedule.calendars
    .filter((v) =>
      Object.entries(filters).every(
        ([filterAlias, filterValue]) =>
          filterValue === undefined || v[filterAlias] === filterValue
      )
    )
    .filter((v) =>
      v.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    );

  return (
    <>
      <div className="flex flex-row flex-wrap gap-4 mt-4 justify-center">
        <CategoriesDropdown categories={categories} selected={category} />
        {schedule.filters.map((v) => (
          <FilterDropdown
            key={v.alias}
            schedule={schedule}
            filterAlias={v.alias}
            selected={filters[v.alias] || ""}
            setSelected={(value) =>
              setFilters((prev) => ({ ...prev, [v.alias]: value || undefined }))
            }
          />
        ))}
        <input
          type="text"
          className="form-control bg-background_dark hover:bg-background rounded-xl sm:text-2xl p-2 border-2 max-w-[200px] lg:ml-auto"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        ></input>
      </div>

      <hr className="border-b-1 w-full mt-4"></hr>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-2 gap-x-4 content-start place-items-center justify-items-stretch overflow-auto scrollbar-hide h-full w-full px-0 md:px-12 mt-4">
        {calendars.map((element) => (
          <ScheduleElement
            key={element.file}
            calendar={element}
            schedule={schedule}
            onClick={() => {
              ymEvent("button-import", { scheduleFile: element.file });
              setSelectedGroupFile(element.file);
              setDialogOpened(true);
            }}
          />
        ))}
      </div>

      <ScheduleDialog
        groupFile={selectedGroupFile}
        opened={dialogOpened}
        close={() => setDialogOpened(false)}
      />
    </>
  );
}
