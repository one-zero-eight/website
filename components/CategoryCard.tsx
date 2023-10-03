import { IconProps } from "@/lib/types/IconProps";
import Link from "next/link";

export type CategoryCardProps = {
  icon: (props: IconProps) => React.JSX.Element;
  slug: string;
  title: string;
  shortDescription: string;
  outdated: boolean;
};

export default function CategoryCard({
  slug,
  icon: Icon,
  title,
  shortDescription,
  outdated,
}: CategoryCardProps) {
  return (
    <Link
      key={slug}
      href={`/schedule/${slug}`}
      className={`my-2 flex basis-80 flex-col items-center justify-between rounded-2xl px-4 py-6 text-center shadow-5xl transition ease-in-out hover:bg-primary-hover hover:bg-primary-main hover:shadow-5xl-m ${
        outdated ? "border-dashed shadow-none" : ""
      }`}
    >
      <Icon className="my-1" width={48} height={48} fill={`#9747FF`} />
      <p className="my-1 text-2xl font-semibold">{title}</p>
      {outdated && (
        <p className="w-fit rounded-xl border border-dashed border-red-500 px-2 py-1 text-sm text-red-500 blur-0">
          Outdated
        </p>
      )}
      <p className="text-lg text-text-secondary/75">{shortDescription}</p>
    </Link>
  );
}
