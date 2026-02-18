import { $events } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import ExportButton from "@/components/schedule/ExportButton.tsx";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton.tsx";
import { getICSLink } from "@/api/events/links.ts";
import { useState } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";
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
        className="bg-base-200 min-h-64 bg-repeat p-4"
      />
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-h-full grow flex-col gap-2">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            <p className="text-base-content/75 text-base whitespace-pre-wrap">
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
              className="bg-base-300 rounded-box flex w-fit px-4 py-2"
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
      <ExportModal
        eventGroupOrTarget={group.id}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </>
  );
}
