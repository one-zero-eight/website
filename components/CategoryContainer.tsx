import CategoryCard from "@/components/CategoryCard";
import { BootcampIcon } from "@/components/icons/BootcampIcon";
import CleaningIcon from "@/components/icons/CleaningIcon";
import CoreCoursesIcon from "@/components/icons/CoreCoursesIcon";
import ElectivesIcon from "@/components/icons/ElectivesIcon";
import SportIcon from "@/components/icons/SportIcon";
import { viewConfig } from "@/lib/events-view-config";

const categoriesIcons: {
  [key: string]: (props: {
    className?: string;
    fill?: string;
  }) => React.JSX.Element;
} = {
  "core-courses": CoreCoursesIcon,
  electives: ElectivesIcon,
  sports: SportIcon,
  cleaning: CleaningIcon,
  bootcamp2023: BootcampIcon,
  "bootcamp2023-workshops": BootcampIcon,
};

export default async function CategoryContainer() {
  return (
    <div className="my-4 flex w-full flex-row flex-wrap justify-center gap-y-8 sm:gap-x-18p lg:gap-x-20 xl:gap-x-28">
      {Object.entries(viewConfig.categories)
        .filter(([_, v]) => !v.outdated)
        .map(([_, v]) => (
          <CategoryCard
            key={v.alias}
            icon={categoriesIcons[v.alias] || categoriesIcons["core-courses"]}
            slug={v.alias}
            title={v.title}
            shortDescription={v.shortDescription}
            outdated={v.outdated}
          />
        ))}
      {/*<div className="h-0 w-full"></div>*/}
      {Object.entries(viewConfig.categories)
        .filter(([_, v]) => v.outdated)
        .map(([_, v]) => (
          <CategoryCard
            key={v.alias}
            icon={categoriesIcons[v.alias] || categoriesIcons["core-courses"]}
            slug={v.alias}
            title={v.title}
            shortDescription={v.shortDescription}
            outdated={v.outdated}
          />
        ))}
    </div>
  );
}
