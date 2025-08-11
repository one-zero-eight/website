import { Topbar } from "@/components/layout/Topbar.tsx";
import { useMe } from "@/api/accounts/user.ts";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { FormsPage } from "@/components/forms";

export const Route = createFileRoute("/_with_menu/forms")({
  component: function FormsRoute() {
    const { me } = useMe();

    // Check staff status and throw error for non-staff users
    if (!me?.innopolis_sso?.is_staff) {
      throw new Error("403 Access denied - Staff only");
    }

    return (
      <>
        <Helmet>
          <title>Forms - One Zero Eight</title>
        </Helmet>

        <Topbar title="Forms" />
        <FormsPage />
      </>
    );
  },
});
