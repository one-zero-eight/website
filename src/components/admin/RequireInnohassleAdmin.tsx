import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { useImpersonatingUser } from "@/components/admin/useImpersonation.ts";
import { isInnohassleAdmin } from "@/components/admin/utils.ts";
import { PropsWithChildren } from "react";

export function RequireInnohassleAdmin({ children }: PropsWithChildren) {
  const { me } = useMe();
  const [impersonatingUser] = useImpersonatingUser();

  if (!me) {
    return <AuthWall />;
  }

  if (!isInnohassleAdmin(me) && !impersonatingUser) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-3xl font-medium">Access denied</h2>
        <p className="text-base-content/75 mt-2 text-lg">
          This page is available only for InNoHassle admins.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
