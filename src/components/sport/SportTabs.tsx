import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import type { ReactNode } from "react";

const SPORT_BOT_URL = "https://t.me/IUSportBot";
const SPORT_ADMIN_URL = "https://sport.innopolis.university/admin/";

export function SportTabs() {
  const { isTrainer, isAdmin } = useSportProfile();

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/sport">Calendar</TabLink>
      <TabLink to="/sport/history">History</TabLink>
      {isTrainer ? <TabLink to="/sport/trainer">Trainer</TabLink> : null}
      <ExternalTabLink href={SPORT_BOT_URL}>
        <span className="inline-flex items-center gap-1">
          <span className="icon-[ic--baseline-telegram] text-base" />
          Bot
        </span>
      </ExternalTabLink>
      <TabLink to="/sport/faq">FAQ</TabLink>
      {isAdmin ? (
        <ExternalTabLink href={SPORT_ADMIN_URL}>Admin</ExternalTabLink>
      ) : null}
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}

function ExternalTabLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className="px-2 py-1" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
