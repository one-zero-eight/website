import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { ScholarshipPage } from "@/components/scholarship/ScholarshipPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/scholarship")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
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

      <NavbarTemplate
        title="Scholarship calculator"
        description="Calculate your scholarship easily. Just type your marks, GPA or expected scholarship."
      />
      <ScholarshipPage />
    </div>
  ),
});
