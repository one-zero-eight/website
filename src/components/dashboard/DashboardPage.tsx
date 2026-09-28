import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { AcademicCalendarWidget } from "@/components/dashboard/AcademicCalendarWidget.tsx";
import { AccountWidget } from "@/components/dashboard/AccountWidget.tsx";
import { AdvWidget } from "@/components/dashboard/AdvWidget.tsx";
import { PwaWidget } from "@/components/dashboard/PwaWidget.tsx";
import { SportsWidget } from "@/components/dashboard/SportsWidget.tsx";
import { MusicRoomWidget } from "@/components/dashboard/MusicRoomWidget.tsx";
import { TelegramReconnectWidget } from "@/components/dashboard/TelegramReconnectWidget.tsx";
import { CalendarWidget } from "./CalendarWidget.tsx";
import Links from "./links/Links.tsx";

export function DashboardPage() {
  const { me } = useMe();

  if (!me) {
    return (
      <div className="flex flex-col gap-64">
        <AuthWall />

        <div className="px-4 py-4">
          <Links />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <AccountWidget />
      <TelegramReconnectWidget />
      <div className="grid min-w-0 gap-4 @4xl/content:grid-cols-2">
        <SportsWidget />
        <CalendarWidget />
      </div>
      <div className="grid min-w-0 gap-4 @4xl/content:grid-cols-2 @7xl/content:grid-cols-3">
        <AcademicCalendarWidget />
        <MusicRoomWidget />
        <PwaWidget />
        <AdvWidget />
      </div>

      <Links />
    </div>
  );
}
