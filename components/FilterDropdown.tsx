"use client";
import { Schedule } from "@/lib/schedule/api";
import React from "react";
import { Popover, Transition } from "@headlessui/react";
import DropListIcon from "@/components/icons/DropListIcon";

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
    <Popover className="relative sm:text-2xl w-max rounded-3xl">
      <Popover.Button className="w-full rounded-3xl">
        <div className="rounded-3xl flex flex-row items-center bg-background py-4 px-5 rounded-3xl text-secondary_hover">
          <p className="mr-4 whitespace-nowrap">{selected || filterTitle}</p>

          <DropListIcon />
        </div>
      </Popover.Button>

      <Transition
        enter="transition duration-120 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-125 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Popover.Panel className="absolute z-10 rounded-3xl bg-background ">
          <div className="flex flex-col justify-center inline-block items-center divide-y divide-border">
            {variants.map((v) => (
              <Popover.Button
                className="w-full rounded-3xl flex flex-row items-center bg-background py-4 px-5 rounded-3xl text-secondary_hover"
                value={v}
                key={v}
                onClick={(e) => setSelected((e.target as any).value)}
              >
                {v}
              </Popover.Button>
            ))}
          </div>
        </Popover.Panel>
      </Transition>
      <Popover.Panel className="absolute z-10"></Popover.Panel>
    </Popover>
  );
}

export default FilterDropdown;
