import { $clubs, clubsTypes } from "@/api/clubs";
import { getLogoURLById } from "@/api/clubs/links.ts";
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
    <div className="bg-base-200 border-inh-secondary rounded-field overflow-hidden border">
      <Link to="/clubs/$slug" params={{ slug: club.slug }} className="block">
        <div className="flex items-center gap-4 p-4">
          <div className="rounded-field flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden">
            <img
              src={getLogoURLById(club.id)}
              alt={`${club.title} logo`}
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget
                  .nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "block";
              }}
            />
            <span className="icon-[mdi--account-group] hidden size-12 text-white" />
          </div>

          <div className="flex grow flex-col justify-between gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <h3 className="text-base-content text-xl font-semibold">
                  {club.title}
                </h3>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
                    getClubTypeColor(club.type),
                  )}
                >
                  {getClubTypeLabel(club.type)}
                </span>
              </div>

              <p className="text-inh-inactive text-base">
                {club.short_description}
              </p>

              {clubLeader && (
                <p className="text-inh-inactive text-base">
                  Leader:{" "}
                  <a href={`https://t.me/${clubLeader.telegram_alias}`}>
                    {clubLeader.name}
                  </a>
                </p>
              )}
            </div>
            <div className="grow" />

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                to="/clubs/$slug"
                params={{ slug: club.slug }}
                className="bg-inh-primary hover:bg-inh-primary-hover text-base-content inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
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
                  className="bg-inh-primary hover:bg-inh-primary-hover text-base-content inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={clsx(getLinkIconClass(link.type), "size-4")}
                  />
                  <span>{getLinkLabel(link.type)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
