import Link from "next/link";
import { IconProps } from "@/lib/types/IconProps";

export type CategoryCardProps = {
  icon: (props: IconProps) => React.JSX.Element;
  slug: string;
  title: string;
  shortDescription: string;
};

export default function CategoryCard(props: CategoryCardProps) {
  const path = `/schedule/${props.slug}`;

  return (
    <Link
      key={props.slug}
      href={path}
      className="text-text-main hover:bg-primary-main shadow-5xl transition ease-in-out hover:shadow-5xl-m flex flex-col justify-between items-center border-4 border-border px-4 py-6 my-2 rounded-3xl text-center basis-80"
    >
      <props.icon className="my-1" width={48} height={48} fill={`#9747FF`} />
      <p className="text-xl xl:text-2xl py-1 font-semibold">{props.title}</p>
      <p className="text-base xl:text-lg text-text-secondary/75">
        {props.shortDescription}
      </p>
    </Link>
  );
}
