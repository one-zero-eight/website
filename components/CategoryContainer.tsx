import CategoryCard from "@/components/CategoryCard";
import { BootcampIcon } from "@/components/icons/BootcampIcon";
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
  bootcamp2023: BootcampIcon,
  "bootcamp2023-workshops": BootcampIcon,
};

export default async function CategoryContainer() {
  return (
    <div className="mt-8 flex w-full flex-row flex-wrap justify-center gap-y-12 sm:gap-x-18p lg:gap-x-20 xl:gap-x-28">
      {Object.entries(viewConfig.categories)
        .filter(([_, v]) => !v.outdated)
        .map(([k, v]) => (
          <CategoryCard
            key={v.alias}
            icon={categoriesIcons[v.alias] || categoriesIcons["core-courses"]}
            slug={v.alias}
            title={v.title}
            shortDescription={v.shortDescription}
            outdated={v.outdated}
          />
        ))}
      <div className="h-0 w-full"></div>
      {Object.entries(viewConfig.categories)
        .filter(([_, v]) => v.outdated)
        .map(([k, v]) => (
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
