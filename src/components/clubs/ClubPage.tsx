import { $clubs } from "@/api/clubs";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import {
  getClubTypeLabel,
  getClubTypeColor,
  getLinkIconClass,
  getLinkLabel,
} from "./constants.ts";

export function ClubPage({ clubSlug }: { clubSlug: string }) {
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const { data: club, isPending: clubPending } = $clubs.useQuery(
    "get",
    "/clubs/by-slug/{slug}",
    {
      params: { path: { slug: clubSlug } },
    },
  );
  const { data: clubLeader } = $clubs.useQuery(
    "get",
    "/leaders/by-club-slug/{slug}",
    {
      params: { path: { slug: clubSlug } },
    },
  );

  if (clubPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">
          Loading club information...
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">Club not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-4">
      {/* Header Section */}
      <div className="card card-border">
        <div className="relative flex items-center justify-center p-8">
          <div
            style={{ backgroundImage: "url(/pattern.svg)" }}
            className="absolute inset-0 bg-repeat"
          />
          <ClubLogo clubId={club.id} className="size-48" />
          {clubsUser?.role === "admin" && (
            <Link
              to="/clubs/$slug/edit"
              params={{ slug: clubSlug }}
              className="btn btn-square btn-ghost btn-primary btn-lg absolute top-0 right-0"
            >
              <span className="icon-[mynaui--pencil]" />
            </Link>
          )}
        </div>
        <div className="card-body">
          <div className="flex justify-between">
            <h1 className="card-title text-3xl font-bold">{club.title}</h1>
            {!club.is_active && (
              <span className="badge badge-error">Inactive</span>
            )}
          </div>
          <span className={clsx("badge", getClubTypeColor(club.type))}>
            {getClubTypeLabel(club.type)}
          </span>
          <p className="text-base-content/80 text-base leading-relaxed">
            {club.short_description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          {/* Description Section */}
          <div className="card card-border">
            <div className="card-body">
              <h2 className="card-title">
                <span className="icon-[material-symbols--article-outline-rounded] size-6" />
                About
              </h2>
              {club.description ? (
                <p className="text-base-content/50">{club.description}</p>
              ) : (
                <p className="text-base-content/50 italic">
                  No detailed description yet.
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div className="card card-border">
            <div className="card-body">
              <h2 className="card-title">
                <span className="icon-[mdi--calendar] size-6" />
                Upcoming Events
              </h2>
              <div className="space-y-4">
                <p className="text-base-content/50 italic">No events yet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="order-1 space-y-6 lg:order-2 lg:col-span-1">
          {/* Links Section */}
          {club.links && club.links.length > 0 && (
            <div className="card card-border">
              <div className="card-body">
                <h2 className="card-title">Resources & Links</h2>
                <ul className="menu w-full p-0">
                  {club.links.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3"
                      >
                        <span
                          className={clsx(
                            "text-base-content",
                            getLinkIconClass(link.type),
                            "size-5",
                          )}
                        />
                        <span className="text-base-content font-medium">
                          {link.label ? link.label : getLinkLabel(link.type)}
                        </span>
                        <span className="icon-[mdi--open-in-new] text-base-content/30 ml-auto size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Leader Section */}
          <div className="card card-border">
            <div className="card-body">
              <h2 className="card-title">
                <span className="icon-[mdi--account] size-6" />
                Club Leader
              </h2>
              {clubLeader ? (
                <div className="space-y-3">
                  {clubLeader.name && (
                    <div className="flex items-start gap-3">
                      <span className="icon-[mdi--account] text-base-content/50 mt-0.5 size-5" />
                      <div>
                        <div className="text-base-content/50 text-sm">Name</div>
                        <div className="text-base-content font-medium">
                          {clubLeader.name}
                        </div>
                      </div>
                    </div>
                  )}
                  {clubLeader.telegram_alias && (
                    <div className="flex items-start gap-3">
                      <span className="icon-[mdi--telegram] text-base-content/50 mt-0.5 size-5" />
                      <div>
                        <div className="text-base-content/50 text-sm">
                          Telegram
                        </div>
                        <a
                          href={`https://t.me/${clubLeader.telegram_alias}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-hover link-primary"
                        >
                          @{clubLeader.telegram_alias}
                        </a>
                      </div>
                    </div>
                  )}
                  {!clubLeader.telegram_alias &&
                    (clubsUser?.role === "admin" ||
                      clubsUser?.leader_in_clubs?.some(
                        (v) => v.id === club.id,
                      )) && (
                      /* Ask leader to connect telegram */
                      <div className="alert alert-warning items-start">
                        <span className="icon-[mdi--alert] size-4" />
                        <span>
                          The club leader should connect their Telegram account
                          to InNoHassle using the{" "}
                          <a
                            href="https://innohassle.ru/account/connect-telegram"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary"
                          >
                            link
                          </a>
                          .
                        </span>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-base-content/50 italic">
                  No leader information available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
