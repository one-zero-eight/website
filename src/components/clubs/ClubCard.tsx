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

export function ClubCard({ club }: { club: clubsTypes.SchemaClub }) {
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const clubLeader = useMemo(
    () =>
      clubLeaders?.find((v) => v.innohassle_id === club.leader_innohassle_id),
    [clubLeaders, club.leader_innohassle_id],
  );

  return (
    <div className="card card-border md:card-side">
      <figure className="shrink-0 items-start p-6 pb-0 md:pr-0 md:pb-6">
        <ClubLogo clubId={club.id} className="size-48" />
      </figure>
      <div className="card-body">
        <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <Link
            to="/clubs/$slug"
            params={{ slug: club.slug }}
            className="card-title link link-hover"
          >
            {club.title}
          </Link>
          <span
            className={clsx(
              "shrink-0 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
              getClubTypeColor(club.type),
            )}
          >
            {getClubTypeLabel(club.type)}
          </span>
        </div>

        <p className="text-base-content/50 text-sm md:text-base">
          {club.short_description}
        </p>

        {clubLeader && (
          <p className="text-base-content/50 text-sm md:text-base">
            Leader:{" "}
            <a
              href={
                clubLeader.telegram_alias
                  ? `https://t.me/${clubLeader.telegram_alias}`
                  : undefined
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="link link-hover"
            >
              {clubLeader.name}
            </a>
          </p>
        )}

        <div className="grow" />

        <div className="card-actions">
          <Link
            to="/clubs/$slug"
            params={{ slug: club.slug }}
            className="btn btn-primary btn-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="icon-[mdi--arrow-right] size-4" />
            <span>Details</span>
          </Link>
          {club.links.map((link, index) => (
            <a
              key={index}
              href={link.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft"
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
