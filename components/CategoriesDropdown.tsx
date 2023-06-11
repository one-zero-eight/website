"use client";
import { Categories, getCategoryInfoByCategories } from "@/lib/schedule/api";
import { Popover } from "@headlessui/react";
import { useRouter } from "next/navigation";
import React from "react";
import DropListIcon from "./icons/DropListIcon";

function CategoriesDropdown({
  categories,
  selected,
}: {
  categories: Categories;
  selected: string;
}) {
  const router = useRouter();
  const categoryInfo = getCategoryInfoByCategories(selected, categories);

  const setSelected = (v: string) => {
    router.push(`/schedule/${v}`);
  };

  return (
    <Popover className="relative text-lg sm:text-2xl pl-2 sm:pl-0 w-1/2 w-fit rounded-xl">
      <Popover.Button className="rounded-xl">
        <div className="flex flex-row items-center w-fit hover:bg-background py-2 border-2 rounded-xl">
          <h3 className="px-2 mr-4">
            {(categoryInfo && categoryInfo.title) || ""}
          </h3>

          <DropListIcon />
        </div>
      </Popover.Button>

      <Popover.Panel className="absolute z-10">
        <div className="flex flex-col justify-center items-center bg-background_dark rounded-xl py-2 border-2">
          {categories.categories.map((v) => (
            <Popover.Button
              className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end"
              value={v.slug}
              key={v.slug}
              onClick={(e) => setSelected((e.target as any).value as string)}
            >
              {v.title}
            </Popover.Button>
          ))}
        </div>
      </Popover.Panel>
    </Popover>
  );
}

export default CategoriesDropdown;
