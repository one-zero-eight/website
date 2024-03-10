import clsx from "clsx";
import Link from "next/link";

export type CategoryCardProps = {
  icon: React.ReactNode;
  slug: string;
  title: string;
  shortDescription: string;
  outdated: boolean;
};

export default function CategoryCard({
  slug,
  icon,
  title,
  shortDescription,
  outdated,
}: CategoryCardProps) {
  return (
    <Link
      key={slug}
      href={`/schedule/${slug}`}
      className={clsx(
        "my-2 flex basis-80 flex-col items-center justify-between gap-2 rounded-2xl bg-base px-4 py-6 text-center text-[#9747FF] shadow-5xl transition ease-in-out hover:bg-primary-hover hover:shadow-5xl-m",
        outdated && "border-dashed shadow-none",
      )}
    >
      {icon}
      <p className="text-2xl font-semibold text-text-main">{title}</p>
      {outdated && (
        <p className="w-fit rounded-xl border border-dashed border-red-500 px-2 py-1 text-sm text-red-500 blur-0">
          Outdated
        </p>
      )}
      <p className="text-lg text-text-secondary/75">{shortDescription}</p>
    </Link>
  );
}
