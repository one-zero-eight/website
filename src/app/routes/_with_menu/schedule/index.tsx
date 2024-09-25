import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { ScheduleMainPage } from "@/components/schedule/ScheduleMainPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/schedule/")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Schedule</title>
        <meta
          name="description"
          content={
            "Schedule of classes and events at Innopolis University. " +
            "Find your group and see the calendar with all classes."
          }
        />
      </Helmet>
      <NavbarTemplate
        title="InNoHassle ecosystem"
        description={
          <>
            Services developed by{" "}
            <a
              href="https://t.me/one_zero_eight"
              className="selected"
              target="_blank"
              rel="noopener noreferrer"
            >
              one-zero-eight
            </a>{" "}
            community for Innopolis students.
          </>
        }
      />
      <ScheduleMainPage />
    </div>
  ),
});
