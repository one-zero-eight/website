"use client";
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

  const optionsInfos = data.tags
    .filter((tag) => tag.type === typeFilter)
    .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0));
  const selectedTagInfo = data.tags.find((tag) => tag.alias === selected);

  return (
    <Popover className="relative z-[1] w-max rounded-2xl opacity-[0.999] focus:outline-none">
      <Popover.Button className="w-full rounded-2xl focus:outline-none">
        <div className="flex flex-row items-center gap-2 rounded-2xl bg-primary-main p-4 py-2.5 text-xl text-text-secondary/75 hover:text-icon-hover/75">
          <p className="whitespace-nowrap">
            {selectedTagInfo?.name || "Filter"}
          </p>

          <span className="icon-[material-symbols--expand-more] text-4xl" />
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
              className="flex w-full flex-row items-center rounded-2xl bg-primary-main px-5 py-4 text-xl text-text-secondary/75 focus:outline-none"
              value={""}
              onClick={(e) => setSelected((e.target as any).value)}
            >
              All
            </Popover.Button>
            {optionsInfos.map((v) => (
              <Popover.Button
                className="flex w-full flex-row items-center whitespace-nowrap rounded-2xl bg-primary-main px-5 py-4 text-xl text-text-secondary/75 focus:outline-none"
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
