import { Calendar } from "@/components/calendar/Calendar.tsx";
import { EventGroupExportModal } from "@/components/calendar/EventGroupExportModal.tsx";
import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton.tsx";
import { events, getICSLink } from "@/lib/events";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useWindowSize } from "usehooks-ts";

export function EventGroupPage({ alias }: { alias: string }) {
  const { data: eventsUser } = events.useUsersGetMe();
  const { data: group } = events.useEventGroupsFindEventGroupByAlias({ alias });
  const { width } = useWindowSize();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <>
      {group && (
        <Helmet>
          <title>{group.name} group — Schedule</title>
          <meta name="description" content={group.description ?? undefined} />
        </Helmet>
      )}
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="h-64 bg-primary-main bg-repeat p-4 @container/navbar @2xl/main:p-12"
      >
        <NavbarTemplate title="" description="" />
      </div>
      {group && (
        <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex min-h-full flex-grow flex-col gap-2">
              <h1 className="text-3xl font-semibold">{group.name}</h1>
              <p className="whitespace-pre-wrap text-base text-text-secondary/75">
                {group.description ||
                  "Hello world, this is a long description about my life and this elective."}
              </p>
            </div>
            <FavoriteButton groupId={group.id} />
          </div>
          <h2 className="my-4 flex text-3xl font-medium">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {group.tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex w-fit rounded-2xl bg-secondary-main px-4 py-2"
              >
                {tag.name}
              </div>
            ))}
          </div>
          <div className="my-4 flex flex-row flex-wrap items-center">
            <h2 className="flex grow text-3xl font-medium">Calendar</h2>
            <ExportButton onClick={() => setExportModalOpen(true)} />
          </div>
          <div className="-mx-4 -mb-4 @lg/content:-mx-8 @lg/content:-mb-8">
            <Calendar
              urls={[
                {
                  url: getICSLink(group.alias, eventsUser?.id),
                  eventGroup: group,
                },
              ]}
              initialView={
                width
                  ? width >= 1280
                    ? "dayGridMonth"
                    : width >= 1024
                      ? "timeGridWeek"
                      : "listMonth"
                  : "dayGridMonth"
              }
              viewId="page"
            />
          </div>
        </div>
      )}
      <EventGroupExportModal
        alias={group?.alias ?? ""}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
