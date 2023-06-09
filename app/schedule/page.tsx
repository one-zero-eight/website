import { getCategories } from "@/lib/schedule/api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Page() {
  const categories = await getCategories();
  if (categories === undefined) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-16">
      <h1 className="text-4xl font-bold">Schedule</h1>
      Firstly, choose a category.
      <div className="flex gap-x-4 mt-8">
        {categories.categories.map((v) => (
          <Link
            key={v.slug}
            href={`/schedule/${v.slug}`}
            className="flex flex-col justify-between items-center border-8 border-border px-4 py-2 my-2 rounded-3xl"
          >
            <p className="text-lg sm:text-2xl font-semibold">{v.title}</p>
            {v.shortDescription}
          </Link>
        ))}
      </div>
    </div>
  );
}
