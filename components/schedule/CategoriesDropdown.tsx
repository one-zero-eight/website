"use client";
import {
  getCategoryInfoBySlug,
  viewConfig,
} from "@/lib/events/events-view-config";
import { Popover, Transition } from "@headlessui/react";
import Link from "next/link";
import React from "react";

function CategoriesDropdown({ category }: { category: string }) {
  const categoryInfo = getCategoryInfoBySlug(category);
  return (
    <Popover className="relative z-[2] w-max rounded-2xl opacity-[0.999] focus:outline-none">
      {({ open }) => (
        <>
          <Popover.Button className="w-full rounded-2xl focus:outline-none">
            <div className="flex flex-row items-center gap-2 rounded-2xl bg-primary-main p-4 py-2.5 text-xl text-text-secondary/75 hover:text-icon-hover/75">
              <p className="whitespace-nowrap">
                {(categoryInfo && categoryInfo.title) || ""}
              </p>

              <span
                className={
                  open
                    ? "icon-[material-symbols--expand-less] text-4xl"
                    : "icon-[material-symbols--expand-more] text-4xl"
                }
              />
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
            <Popover.Panel className="absolute rounded-2xl bg-primary-main drop-shadow-2xl focus:outline-none">
              <div className="flex flex-col items-center justify-center divide-y divide-border">
                {Object.values(viewConfig.categories).map((v) => (
                  <Link
                    href={`/schedule/${v.alias}`}
                    key={v.alias}
                    className="flex w-full flex-row items-center rounded-2xl bg-primary-main px-5 py-4 text-xl text-text-secondary/75 focus:outline-none"
                  >
                    {v.title}
                  </Link>
                ))}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export default CategoriesDropdown;
