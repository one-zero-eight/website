import { getCategories } from "@/lib/schedule/api";
import { notFound } from "next/navigation";
import CategoryCard from "@/components/CategoryCard";

export default async function CategoryContainer() {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }
  return (
    <div className="flex flex-row flex-wrap sm:flex-nowrap gap-x-4 mt-8">
      {categories.categories.map((v) => (
        <CategoryCard
          slug={v.slug}
          title={v.title}
          shortDescription={v.shortDescription}
        />
      ))}
    </div>
  )
}