import CategoryCard from "@/components/schedule/CategoryCard";
import { viewConfig } from "@/lib/events-view-config";

const categoriesIcons: {
  [key: string]: React.ReactNode;
} = {
  "core-courses": (
    <span className="icon-[material-symbols--hub-outline] text-5xl" />
  ),
  electives: (
    <span className="icon-[material-symbols--widgets-outline] text-5xl" />
  ),
  sports: <span className="icon-[material-symbols--sports-soccer] text-5xl" />,
  cleaning: <span className="icon-[material-symbols--mop-outline] text-5xl" />,
  bootcamp2023: null,
  "bootcamp2023-workshops": null,
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
