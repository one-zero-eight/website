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
  const path = `/schedule/${slug}`;

  return (
    <Link
      key={slug}
      href={path}
      className={`text-text-main hover:bg-primary-main shadow-5xl transition ease-in-out hover:shadow-5xl-m flex flex-col justify-between items-center border-4 border-border px-4 py-6 my-2 rounded-3xl text-center basis-80 ${
        outdated ? "shadow-none border-dashed" : ""
      }`}
    >
      <Icon className="my-1" width={48} height={48} fill={`#9747FF`} />
      <p className="text-xl xl:text-2xl py-1 font-semibold">{title}</p>
      {outdated && (
        <p className="blur-0 text-red-500 text-sm border border-dashed border-red-500 w-fit py-1 px-2 rounded-full">
          Outdated
        </p>
      )}
      <p className="text-base xl:text-lg text-text-secondary/75">
        {shortDescription}
      </p>
    </Link>
  );
}
