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
    <Popover className="relative text-lg sm:text-2xl w-fit rounded-xl">
      <Popover.Button className="rounded-xl">
        <div className="flex flex-row items-center w-fit hover:bg-background p-2 border-2 rounded-xl">
          <div className="mr-4 whitespace-nowrap">
            {selected || filterTitle}
          </div>

          <DropListIcon />
        </div>
      </Popover.Button>

      <Popover.Panel className="absolute z-10">
        <div className="flex flex-col justify-center items-center bg-background_dark rounded-xl border-2">
          <Popover.Button
            className="py-2 px-4 w-full hover:bg-section_g_end whitespace-nowrap rounded-xl"
            value={""}
            onClick={(e) => setSelected((e.target as any).value)}
          >
            All
          </Popover.Button>
          {variants.map((v) => (
            <Popover.Button
              className="py-2 px-4 w-full hover:bg-section_g_end whitespace-nowrap rounded-xl"
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
