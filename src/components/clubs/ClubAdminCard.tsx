import { $clubs, clubsTypes } from "@/api/clubs";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo } from "react";
import {
  getClubTypeLabel,
  getClubTypeColor,
  getLinkIconClass,
  getLinkLabel,
} from "./utils";

export function ClubAdminCard({ club }: { club: clubsTypes.SchemaClub }) {
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const clubLeader = useMemo(
    () =>
      club.leader_innohassle_id
        ? clubLeaders?.[club.leader_innohassle_id]
        : undefined,
    [clubLeaders, club.leader_innohassle_id],
  );

  return (
    <div className="card card-border card-sm md:card-side">
      <figure className="shrink-0 items-start p-4 pb-0 md:pr-0 md:pb-4">
        <ClubLogo clubId={club.id} className="size-16 md:size-20" />
      </figure>

      <div className="card-body">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              to="/clubs/$slug"
              params={{ slug: club.slug }}
              className="card-title link link-hover truncate text-base md:text-lg"
            >
              {club.title}
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={clsx("badge badge-sm", getClubTypeColor(club.type))}
            >
              {getClubTypeLabel(club.type)}
            </span>
            {!club.is_active && (
              <span className="badge badge-sm badge-error">Inactive</span>
            )}
          </div>
        </div>

        <p className="text-base-content/50 line-clamp-1 text-sm">
          {club.short_description}
        </p>

        <div className="flex items-center gap-2">
          <Link
            to="/clubs/$slug/edit"
            params={{ slug: club.slug }}
            className="btn btn-primary btn-soft btn-sm"
          >
            <span className="icon-[mdi--pencil] size-4" />
            <span>Edit</span>
          </Link>
          <Link
            to="/clubs/$slug"
            params={{ slug: club.slug }}
            className="btn btn-soft btn-sm"
          >
            <span className="icon-[mdi--arrow-right] size-4" />
            <span>View</span>
          </Link>
          {clubLeader && (
            <a
              href={
                clubLeader.telegram_alias
                  ? `https://t.me/${clubLeader.telegram_alias}`
                  : undefined
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {clubLeader.telegram_alias && (
                <span className="icon-[mdi--telegram] size-4" />
              )}
              <span>{clubLeader?.name || "Leader"}</span>
            </a>
          )}
          {club.links.map((link, index) => (
            <a
              key={index}
              href={link.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span className={clsx(getLinkIconClass(link.type), "size-4")} />
              <span>{getLinkLabel(link.type)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
