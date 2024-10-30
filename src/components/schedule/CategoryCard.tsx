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
      className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
    >
      <div className="w-12 text-brand-violet">{icon}</div>
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-semibold text-text-main">
          {title}
          {outdated && (
            <span className="ml-2 w-fit rounded-xl border border-dashed border-red-500 px-2 py-1 text-sm text-red-500 blur-0">
              Outdated
            </span>
          )}
        </p>
        <p className="text-lg text-text-secondary/75">{shortDescription}</p>
      </div>
    </Link>
  );
}
