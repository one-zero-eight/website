"use client";
import { Categories, getCategoryInfoByCategories } from "@/lib/schedule/api";
import { useRouter } from "next/navigation";
import React from "react";
import { Dropdown } from "@/components/Dropdown";
import DropdownButton from "@/components/DropdownButton";

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
    <Dropdown optionInfo={(categoryInfo && categoryInfo.title) || ""}>
      {categories.categories.map((v) => (
        <DropdownButton
          title={v.title}
          key={v.slug}
          func={(e) => setSelected((e.target as any).value as string)}
        />
      ))}
    </Dropdown>
  );
}

export default CategoriesDropdown;
