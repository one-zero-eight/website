import { Link } from "@tanstack/react-router";

export type CategoryCardProps = {
  icon: React.ReactNode;
  slug: string;
  title: string;
  shortDescription: string;
  outdated: boolean;
};

export function CategoryCard({
  slug,
  icon,
  title,
  shortDescription,
  outdated,
}: CategoryCardProps) {
  return (
    <Link
      key={slug}
      to="/schedule/$category"
      params={{ category: slug }}
      className="group bg-inh-primary hover:bg-inh-secondary rounded-box flex flex-row gap-4 px-4 py-6"
    >
      <div className="text-primary w-12">{icon}</div>
      <div className="flex flex-col gap-2">
        <p className="text-base-content text-2xl font-semibold">
          {title}
          {outdated && (
            <span className="blur-0 ml-2 w-fit rounded-xl border border-dashed border-red-500 px-2 py-1 text-sm text-red-500">
              Outdated
            </span>
          )}
        </p>
        <p className="text-base-content/75 text-lg">{shortDescription}</p>
      </div>
    </Link>
  );
}
