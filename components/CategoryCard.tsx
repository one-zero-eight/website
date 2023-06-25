import Link from "next/link";

export type CategoryCardProps = {
  slug: string;
  title: string;
  shortDescription: string;
}

export default function CategoryCard({
  slug,
  title,
  shortDescription
}: CategoryCardProps) {
  const path = `/schedule/${slug}`

  return (
    <Link
      key={slug}
      href={path}
      className="hover:bg-background flex flex-col justify-between items-center border-8 border-border px-4 py-2 my-2 rounded-3xl text-center w-full sm:w-fit"
    >
      <p className="sm:text-2xl font-semibold selected">{title}</p>
      {shortDescription}
    </Link>
  )
}