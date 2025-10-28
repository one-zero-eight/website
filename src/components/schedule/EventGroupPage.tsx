import { $events } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { EventGroupExportModal } from "@/components/calendar/EventGroupExportModal.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton.tsx";
import { getICSLink } from "@/lib/events/links.ts";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useWindowSize } from "usehooks-ts";

export function EventGroupPage({ alias }: { alias: string }) {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: group } = $events.useQuery("get", "/event-groups/by-alias", {
    params: { query: { alias } },
  });
  const { width } = useWindowSize();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  if (!group) {
    return <Topbar title="Group" />;
  }

  return (
    <>
      <Helmet>
        <title>{group.name} group — Schedule</title>
        <meta name="description" content={group.description ?? undefined} />
      </Helmet>

      <Topbar title="Group" />
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="bg-primary min-h-64 bg-repeat p-4"
      />
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-h-full grow flex-col gap-2">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            <p className="text-contrast/75 text-base whitespace-pre-wrap">
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
              className="bg-secondary flex w-fit rounded-2xl px-4 py-2"
            >
              {tag.name}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">Calendar</h2>
          <ExportButton onClick={() => setExportModalOpen(true)} />
        </div>
      </div>
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
      <EventGroupExportModal
        alias={group?.alias ?? ""}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
