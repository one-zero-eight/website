import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScholarshipPage } from "@/components/scholarship/ScholarshipPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/scholarship")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Scholarship calculator</title>
        <meta
          name="description"
          content={
            "Calculate your scholarship at Innopolis University. " +
            "Type your marks for the previous semester to see the expected scholarship."
          }
        />
      </Helmet>

      <Topbar title="Scholarship" />
      <ScholarshipPage />
    </>
  );
}
