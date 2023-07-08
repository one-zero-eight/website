"use client";
import DropListIcon from "@/components/icons/DropListIcon";
import { getTypeInfoBySlug, viewConfig } from "@/lib/events-view-config";
import { Popover, Transition } from "@headlessui/react";
import Link from "next/link";
import React from "react";

function CategoriesDropdown({ category }: { category: string }) {
  const typeInfo = getTypeInfoBySlug(category);
  return (
    <Popover className="relative text-xl w-max z-[1] opacity-[0.999] rounded-full focus:outline-none">
      <Popover.Button className="w-full rounded-full focus:outline-none">
        <div className="rounded-full flex flex-row items-center bg-primary-main py-2 px-5 text-xl text-text-secondary/75">
          <p className="mr-4 whitespace-nowrap">
            {(typeInfo && typeInfo.title) || ""}
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
        <Popover.Panel className="absolute rounded-2xl drop-shadow-2xl bg-primary-main focus:outline-none">
          <div className="flex flex-col justify-center items-center divide-y divide-border">
            {Object.values(viewConfig.types).map((v) => (
              <Link
                href={`/schedule/${v.slug}`}
                key={v.slug}
                className="w-full rounded-xl flex flex-row items-center bg-primary-main py-4 px-5 text-xl text-text-secondary/75 focus:outline-none"
              >
                {v.title}
              </Link>
            ))}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

export default CategoriesDropdown;
