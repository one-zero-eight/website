import { $clubs } from "@/api/clubs";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { Link } from "@tanstack/react-router";

export function ClubPendingUpdatesPage() {
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const { data: clubs, isPending } = $clubs.useQuery(
    "get",
    "/clubs/pending-updates",
  );

  if (clubsUser?.role !== "admin") {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/50 text-lg">
          Loading pending changes...
        </div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <span className="icon-[mdi--check-circle-outline] text-base-content/20 size-12" />
        <div className="text-base-content/50 text-lg">No pending changes</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="text-base-content/70 text-sm">
        <span className="font-semibold">{clubs.length}</span>{" "}
        {clubs.length === 1 ? "club has" : "clubs have"} changes awaiting
        approval
      </div>

      <div className="flex flex-col gap-4">
        {clubs.map((club) => (
          <Link
            key={club.id}
            to="/clubs/pending-updates/$slug"
            params={{ slug: club.slug }}
            className="card card-border card-sm hover:border-primary/40 md:card-side transition-colors"
          >
            <figure className="shrink-0 items-start p-4 pb-0 md:pr-0 md:pb-4">
              <ClubLogo
                clubId={club.id}
                logoFileId={club.logo_file_id}
                className="size-16 md:size-20"
              />
            </figure>
            <div className="card-body">
              <div className="flex items-center justify-between gap-2">
                <span className="card-title text-base md:text-lg">
                  {club.title}
                </span>
                <span className="badge badge-warning badge-sm">
                  Pending review
                </span>
              </div>
              <p className="text-base-content/50 line-clamp-1 text-sm">
                {club.short_description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
