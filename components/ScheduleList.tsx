"use client";
import ScheduleDialog from "@/components/ScheduleDialog";
import { Categories, Schedule } from "@/lib/schedule/api";
import { ymEvent } from "@/lib/tracking/YandexMetrika";
import { useState } from "react";
import CategoriesDropdown from "./CategoriesDropdown";
import FilterDropdown from "./FilterDropdown";
import ScheduleElement from "./ScheduleElement";
import SearchBar from "@/components/SearchBar";

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
      <div className="flex flex-row flex-wrap gap-4 mt-4 justify-center xl:justify-normal">
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
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={"Find the group..."}
          width={450}
        />
      </div>

      <hr className="border-b-1 w-full mt-4 border-border"></hr>

      <div className="flex flex-wrap justify-center gap-y-2 gap-x-10 content-start place-items-center justify-items-stretch overflow-auto scrollbar-hide h-full w-full px-0 md:px-12 mt-4">
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
