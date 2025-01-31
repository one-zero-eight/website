import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { AcademicCalendarWidget } from "@/components/dashboard/AcademicCalendarWidget.tsx";
import { AccountWidget } from "@/components/dashboard/AccountWidget.tsx";
import { AdvWidget } from "@/components/dashboard/AdvWidget.tsx";
import { CountdownWidget } from "@/components/dashboard/CountdownWidget.tsx";
import { PwaWidget } from "@/components/dashboard/PwaWidget.tsx";
import { SportsWidget } from "@/components/dashboard/SportsWidget.tsx";
import { Link } from "@tanstack/react-router";
import Links from "./Links";

export function DashboardPage() {
  const { me } = useMe();

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <AccountWidget />
      <div className="grid gap-4 @4xl/content:grid-cols-2 @7xl/content:grid-cols-3">
        <AcademicCalendarWidget />
        <SportsWidget />
        <CountdownWidget />
        <PwaWidget />
        <AdvWidget />
      </div>

      <Link
        to="/calendar"
        className="flex w-fit items-center font-medium text-brand-violet hover:underline"
      >
        <span className="icon-[material-symbols--arrow-forward] mr-1 text-xl" />
        Go to calendar
      </Link>

      <Links />
    </div>
  );
}
