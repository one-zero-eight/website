import { useMe } from "@/api/accounts/user.ts";
import { ymUserParams } from "@/app/tracking/YandexMetrika.tsx";
import { useEffect } from "react";

export function UserInfoTracker() {
  const { me } = useMe();

  // Send user info to Yandex Metrika
  useEffect(() => {
    if (me) {
      ymUserParams({
        UserID: me.id,
        email: me.innopolis_sso?.email,
        name: me.innopolis_sso?.name,
      });
    }
  }, [me]);

  return null;
}
