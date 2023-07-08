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
  sport: SportIcon,
};

export default async function CategoryContainer() {
  return (
    <div className="flex flex-row flex-wrap justify-center w-full gap-y-12 lg:gap-x-20 xl:gap-x-28 mt-8">
      {Object.entries(viewConfig.types).map(([k, v]) => (
        <CategoryCard
          key={v.slug}
          icon={categoriesIcons[v.slug] || categoriesIcons["core-courses"]}
          slug={v.slug}
          title={v.title}
          shortDescription={v.shortDescription}
        />
      ))}
    </div>
  );
}
