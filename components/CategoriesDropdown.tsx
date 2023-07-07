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
    <Popover className="relative text-xl w-max z-[1] opacity-[0.999] rounded-full focus:outline-none">
      <Popover.Button className="w-full rounded-full focus:outline-none">
        <div className="rounded-full flex flex-row items-center bg-background py-2 px-5 text-xl text-secondary_hover">
          <p className="mr-4 whitespace-nowrap">
            {(categoryInfo && categoryInfo.title) || ""}
          </p>

          <DropListIcon className="fill-secondary hover:fill-secondary_hover" />
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
        <Popover.Panel className="absolute rounded-2xl drop-shadow-2xl bg-background focus:outline-none">
          <div className="flex flex-col justify-center items-center divide-y divide-border">
            {categories.categories.map((v) => (
              <Popover.Button
                className="w-full rounded-xl flex flex-row items-center bg-background py-4 px-5 text-xl text-secondary_hover focus:outline-none"
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
    </Popover>
  );
}

export default CategoriesDropdown;
