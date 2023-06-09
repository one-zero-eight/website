"use client";
import { Schedule } from "@/lib/schedule/api";
import { Popover } from "@headlessui/react";
import React from "react";
import DropListIcon from "./icons/DropListIcon";

function FilterDropdown({
  schedule,
  filterAlias,
  selected,
  setSelected,
}: {
  schedule: Schedule;
  filterAlias: string;
  selected: string;
  setSelected: (v: string) => void;
}) {
  const variants = schedule.calendars
    .map((v) => v[filterAlias])
    .filter((v, index, array) => array.indexOf(v) === index)
    .sort();
  const filterTitle = schedule.filters.filter((v) => v.alias === filterAlias)[0]
    .title;

  return (
    <Popover className="relative text-lg sm:text-2xl border-2 w-fit rounded-xl py-2">
      <Popover.Button>
        <div className="flex flex-row items-center">
          <div className="px-2 mr-4 whitespace-nowrap">
            {selected || filterTitle}
          </div>

          <DropListIcon />
        </div>
      </Popover.Button>

      <Popover.Panel className="absolute z-10">
        <div className="flex flex-col justify-center items-center bg-background_dark rounded-xl py-2 border-2">
          <Popover.Button
            className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end whitespace-nowrap"
            value={""}
            onClick={(e) => setSelected((e.target as any).value)}
          >
            All
          </Popover.Button>
          {variants.map((v) => (
            <Popover.Button
              className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end whitespace-nowrap"
              value={v}
              key={v}
              onClick={(e) => setSelected((e.target as any).value)}
            >
              {v}
            </Popover.Button>
          ))}
        </div>
      </Popover.Panel>
    </Popover>
  );
}

export default FilterDropdown;
