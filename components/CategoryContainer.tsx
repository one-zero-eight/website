import CategoryCard from "@/components/CategoryCard";
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
};

export default async function CategoryContainer() {
  return (
    <div className="flex flex-row flex-wrap justify-center w-full gap-y-12 sm:gap-x-18p lg:gap-x-20 xl:gap-x-28 mt-8">
      {Object.entries(viewConfig.categories).map(([k, v]) => (
        <CategoryCard
          key={v.alias}
          icon={categoriesIcons[v.alias] || categoriesIcons["core-courses"]}
          slug={v.alias}
          title={v.title}
          shortDescription={v.shortDescription}
        />
      ))}
    </div>
  );
}
