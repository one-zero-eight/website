"use client";
import { useUsersGetMe } from "@/lib/events";
import { ymUserParams } from "@/lib/tracking/YandexMetrika";
import { useEffect } from "react";

export default function UserInfoTracker() {
  const { data } = useUsersGetMe();

  // Send user info to Yandex Metrika
  useEffect(() => {
    if (data) {
      ymUserParams({
        UserID: data.id,
        email: data.email,
        name: data.name,
      });
    }
  }, [data]);

  return <></>;
}
