"use client";
import DropListIcon from "@/components/icons/DropListIcon";
import { useTagsListTags } from "@/lib/events";
import { Popover, Transition } from "@headlessui/react";
import React from "react";

function FilterDropdown({
  typeFilter,
  selected,
  setSelected,
}: {
  typeFilter: string;
  selected: string;
  setSelected: (v: string) => void;
}) {
  const { data } = useTagsListTags();

  if (data === undefined) return null;

  const optionsInfos = data.tags.filter((tag) => tag.type === typeFilter);
  const selectedTagInfo = data.tags.find((tag) => tag.alias === selected);

  return (
    <Popover className="relative z-[1] w-max rounded-full text-xl opacity-[0.999] focus:outline-none">
      <Popover.Button className="w-full rounded-full focus:outline-none">
        <div className="flex flex-row items-center rounded-full bg-primary-main px-5 py-2 text-xl text-text-secondary/75">
          <p className="mr-4 whitespace-nowrap">
            {selectedTagInfo?.name || "Filter"}
          </p>

          <DropListIcon className="fill-icon-main/50 hover:fill-icon-hover/75" />
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
        <Popover.Panel className="absolute z-10 rounded-2xl bg-primary-main drop-shadow-2xl focus:outline-none">
          <div className="flex flex-col items-center justify-center divide-y divide-border">
            <Popover.Button
              className="flex w-full flex-row items-center rounded-xl bg-primary-main px-5 py-4 text-xl text-text-secondary/75 focus:outline-none"
              value={""}
              onClick={(e) => setSelected((e.target as any).value)}
            >
              All
            </Popover.Button>
            {optionsInfos.map((v) => (
              <Popover.Button
                className="flex w-full flex-row items-center rounded-xl bg-primary-main px-5 py-4 text-xl text-text-secondary/75 focus:outline-none"
                value={v.alias}
                key={v.alias}
                onClick={(e) => setSelected((e.target as any).value)}
              >
                {v.name}
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
