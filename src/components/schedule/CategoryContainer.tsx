import { CategoryCard } from "@/components/schedule/CategoryCard";
import {
  getCategoryShortDescription,
  getCategoryTitle,
  viewConfig,
} from "@/components/schedule/view-config.ts";
import { useAppLocale } from "@/locales/lib";

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
};

export function CategoryContainer() {
  const [locale] = useAppLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {Object.entries(viewConfig.categories)
        .filter(([_, v]) => !v.outdated)
        .map(([_, v]) => (
          <CategoryCard
            key={v.alias}
            icon={categoriesIcons[v.alias] || categoriesIcons["core-courses"]}
            slug={v.alias}
            title={getCategoryTitle(v, locale)}
            shortDescription={getCategoryShortDescription(v, locale)}
            outdated={v.outdated}
          />
        ))}
    </div>
  );
}
