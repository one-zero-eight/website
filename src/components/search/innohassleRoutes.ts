import { CalendarPage } from "@/components/calendar/CalendarPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DormsPage } from "@/components/dorms/DormsPage";
import { ExtensionPage } from "@/components/extension/ExtensionPage";
import { MapsPage } from "@/components/maps/MapsPage";
import { MusicRoomPage } from "@/components/music-room/MusicRoomPage";
import { PrintersPage } from "@/components/printers/PrintersPage";
import SchedulePage from "@/components/schedule/SchedulePage";
import { ScholarshipPage } from "@/components/scholarship/ScholarshipPage";
import { SportPage } from "../sport/SportPage";
import { RoomBookingRules } from "../room-booking/rules/RoomBookingRules";

type PageEntry = {
  component: React.ComponentType<any>;
  parseParams?: (params: URLSearchParams) => Record<string, any>;
};

export const componentByPath: Record<string, PageEntry> = {
  "/calendar": { component: CalendarPage },
  "/dashboard": { component: DashboardPage },
  "/dorms": { component: DormsPage },
  "/extension": { component: ExtensionPage },
  "/maps": {
    component: MapsPage,
    parseParams: (params) => ({
      sceneId: params.get("scene") ?? undefined,
      areaId: params.get("area") ?? undefined,
      q: undefined,
    }),
  },
  "/music-room": { component: MusicRoomPage },
  "/printers": { component: PrintersPage },
  "/room-booking": { component: RoomBookingRules },
  "/schedule": {
    component: SchedulePage,
    parseParams: (params) => ({
      category: params.get("category") ?? null,
    }),
  },
  "/scholarship": { component: ScholarshipPage },
  "/sport": { component: SportPage },
};

export function resolvePageByUrl(url: string): {
  Component: React.ComponentType<any>;
  props: Record<string, any>;
} | null {
  try {
    const parsedURL = new URL(url, window.location.origin);
    const pathname = parsedURL.pathname;

    const match = Object.entries(componentByPath).find(
      ([path]) => pathname === path || pathname.startsWith(path + "/"),
    );

    if (!match) return null;

    const [, { component, parseParams }] = match;
    const props = parseParams?.(parsedURL.searchParams) ?? {};

    return {
      Component: component,
      props,
    };
  } catch {
    return null;
  }
}
