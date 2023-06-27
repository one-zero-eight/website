import { getCategories } from "@/lib/schedule/api";
import { notFound } from "next/navigation";
import CategoryCard from "@/components/CategoryCard";
import CoreCoursesIcon from "@/components/icons/CoreCoursesIcon";
import ElectivesIcon from "@/components/icons/ElectivesIcon";
import SportIcon from "@/components/icons/SportIcon";

export default async function CategoryContainer() {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }
  const categoriesIcons = {
    "core-courses": CoreCoursesIcon,
    "electives": ElectivesIcon,
    "sport": SportIcon
  }
  return (
    <div className="flex flex-row flex-wrap justify-center w-full gap-y-12 lg:gap-x-20 xl:gap-x-28 mt-8">
      {categories.categories.map((v) => (
        <CategoryCard
          icon={categoriesIcons[v.slug]}
          slug={v.slug}
          title={v.title}
          shortDescription={v.shortDescription}
        />
      ))}
    </div>
  )
}