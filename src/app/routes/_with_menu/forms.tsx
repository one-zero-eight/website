import { useMe } from "@/api/accounts/user.ts";
import { FormsPage } from "@/components/forms";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/forms")({
  component: RouteComponent,
});

function RouteComponent() {
  const { me } = useMe();

  // Check staff status and throw error for non-staff users
  if (!me?.innopolis_sso?.is_staff) {
    throw new Error("403 Access denied - Staff only");
  }

  return (
    <>
      <Helmet>
        <title>Forms</title>
      </Helmet>

      <Topbar title="Forms" />
      <FormsPage />
    </>
  );
}
