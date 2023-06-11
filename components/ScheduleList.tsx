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
          className="hover:bg-background form-control rounded-xl bg-background_dark font-semibold text-lg sm:text-xl px-2 py-2 sm:py-3 w-5/6 border-2 max-w-[200px] lg:ml-auto"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        ></input>
      </div>

      <hr className="border-b-1 w-full mt-4"></hr>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-y-2 gap-x-4 content-start place-items-center justify-items-stretch overflow-auto scrollbar-hide h-full w-full px-0 md:px-12 mt-4">
        {calendars.map((element) => (
          <ScheduleElement
            name={element.name}
            category={category}
            key={element.file}
            calendar={element}
            schedule={schedule}
            onClick={() => {
              ymEvent("button-import", { scheduleFile: element.file });
              setSelectedGroupFile(element.file);
            }}
          />
        ))}
      </div>

      <ScheduleDialog
        groupFile={selectedGroupFile}
        opened={selectedGroupFile !== ""}
        close={() => {
          setSelectedGroupFile("");
        }}
      />
    </>
  );
}
