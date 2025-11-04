import { $clubs } from "@/api/clubs";
import { getLogoURLById } from "@/api/clubs/links.ts";
import clsx from "clsx";
import {
  getClubTypeLabel,
  getClubTypeColor,
  getLinkIconClass,
  getLinkLabel,
} from "./utils";

// Mock events data
const mockEvents = [
  {
    id: "1",
    title: "Weekly Club Meeting",
    date: "2025-11-10",
    time: "18:00",
    location: "Room 301",
  },
  {
    id: "2",
    title: "Workshop: Introduction to React",
    date: "2025-11-15",
    time: "16:00",
    location: "Room 205",
  },
  {
    id: "3",
    title: "Club Social Event",
    date: "2025-11-20",
    time: "19:00",
    location: "Student Lounge",
  },
];

export function ClubPage({ clubSlug }: { clubSlug: string }) {
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
        <div className="text-inactive text-lg">Loading club information...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inactive text-lg">Club not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header Section */}
      <div className="bg-floating border-secondary mb-6 overflow-hidden rounded-lg border">
        <div className="from-brand-gradient-start to-brand-gradient-end flex items-center justify-center bg-linear-to-br p-8">
          <div className="relative size-48 shrink-0 overflow-hidden rounded-lg">
            <img
              src={getLogoURLById(club.id)}
              alt={`${club.title} logo`}
              className="size-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget
                  .nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <span className="icon-[mdi--account-group] absolute inset-0 hidden items-center justify-center text-white opacity-90" />
          </div>
        </div>
        <div className="p-6">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h1 className="text-contrast mb-2 text-3xl font-bold">
                {club.title}
              </h1>
              <span
                className={clsx(
                  "inline-block rounded-full px-3 py-1 text-sm font-medium",
                  getClubTypeColor(club.type),
                )}
              >
                {getClubTypeLabel(club.type)}
              </span>
            </div>
            {!club.is_active && (
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400">
                Inactive
              </span>
            )}
          </div>
          <p className="text-contrast/80 mt-4 leading-relaxed">
            {club.short_description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description Section */}
          {club.description && (
            <div className="bg-floating border-secondary rounded-lg border p-6">
              <h2 className="text-contrast mb-4 text-xl font-semibold">
                About
              </h2>
              <p className="text-contrast/70 leading-relaxed whitespace-pre-wrap">
                {club.description}
              </p>
            </div>
          )}

          {/* Upcoming Events Section */}
          <div className="bg-floating border-secondary rounded-lg border p-6">
            <h2 className="text-contrast mb-4 flex items-center gap-2 text-xl font-semibold">
              <span className="icon-[mdi--calendar] size-6" />
              Upcoming Events
            </h2>
            <div className="space-y-4">
              {mockEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-secondary hover:bg-primary rounded-lg border p-4 transition-colors"
                >
                  <h3 className="text-contrast mb-2 font-semibold">
                    {event.title}
                  </h3>
                  <div className="text-inactive space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="icon-[mdi--calendar] size-4" />
                      <span>
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="icon-[mdi--map-marker] size-4" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Links Section */}
          {club.links && club.links.length > 0 && (
            <div className="bg-floating border-secondary rounded-lg border p-6">
              <h2 className="text-contrast mb-4 text-xl font-semibold">
                Resources & Links
              </h2>
              <div className="space-y-3">
                {club.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary-hover flex items-center gap-3 rounded-lg p-3 transition-colors"
                  >
                    <span
                      className={clsx(
                        "text-contrast",
                        getLinkIconClass(link.type),
                        "size-5",
                      )}
                    />
                    <span className="text-contrast font-medium">
                      {link.label ? link.label : getLinkLabel(link.type)}
                    </span>
                    <span className="icon-[mdi--open-in-new] text-inactive ml-auto size-4" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Leader Section */}
          {clubLeader && (
            <div className="bg-floating border-secondary rounded-lg border p-6">
              <h2 className="text-contrast mb-4 flex items-center gap-2 text-xl font-semibold">
                <span className="icon-[mdi--account] size-6" />
                Club Leader
              </h2>
              <div className="space-y-3">
                {clubLeader.name && (
                  <div className="flex items-start gap-3">
                    <span className="icon-[mdi--account] text-inactive mt-0.5 size-5" />
                    <div>
                      <div className="text-inactive text-sm">Name</div>
                      <div className="text-contrast font-medium">
                        {clubLeader.name}
                      </div>
                    </div>
                  </div>
                )}
                {clubLeader.telegram_alias && (
                  <div className="flex items-start gap-3">
                    <span className="icon-[mdi--telegram] text-inactive mt-0.5 size-5" />
                    <div>
                      <div className="text-inactive text-sm">Telegram</div>
                      <a
                        href={`https://t.me/${clubLeader.telegram_alias}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-violet hover:underline"
                      >
                        @{clubLeader.telegram_alias}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
