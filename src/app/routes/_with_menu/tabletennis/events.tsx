import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Topbar } from "@/components/layout/Topbar.tsx";

export const Route = createFileRoute("/_with_menu/tabletennis/events")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Table tennis</title>
        <meta name="description" content="Table tennis site" />
      </Helmet>

      <Topbar title="Table tennis club" />
      <TabletennisTabs />
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:py-24">
        <span className="icon-[mdi--calendar-star] text-6xl text-[#712BB2]/40 md:text-7xl" />
        <h2 className="text-base-content text-2xl font-light">
          Events will be created soon
        </h2>
        <p className="text-base-content/60 max-w-md text-sm md:text-base">
          Club events, open trainings and friendly matches will appear here.
          Stay tuned!
        </p>
      </div>
    </>
  );
}
