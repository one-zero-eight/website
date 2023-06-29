"use client";
import { Categories, getCategoryInfoByCategories } from "@/lib/schedule/api";
import { useRouter } from "next/navigation";
import { Popover, Transition } from "@headlessui/react";
import React from "react";
import DropListIcon from "@/components/icons/DropListIcon";

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
    <Popover className="relative sm:text-2xl w-max rounded-3xl">
      <Popover.Button className="w-full rounded-3xl">
        <div className="rounded-3xl flex flex-row items-center bg-background py-4 px-5 rounded-3xl text-secondary_hover">
          <p className="mr-4 whitespace-nowrap">
            {(categoryInfo && categoryInfo.title) || ""}
          </p>

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
            {categories.categories.map((v) => (
              <Popover.Button
                className="w-full rounded-3xl flex flex-row items-center bg-background py-4 px-5 rounded-3xl text-secondary_hover"
                value={v.slug}
                key={v.slug}
                onClick={(e) => setSelected((e.target as any).value as string)}
              >
                {v.title}
              </Popover.Button>
            ))}
          </div>
        </Popover.Panel>
      </Transition>
      <Popover.Panel className="absolute z-10"></Popover.Panel>
    </Popover>
  );
}

export default CategoriesDropdown;
