import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import type { ReactNode } from "react";

const SPORT_WEBSITE_URL = "https://sport.innopolis.university";
const SPORT_BOT_URL = "https://t.me/IUSportBot";

export function SportTabs({ isTrainer }: { isTrainer: boolean }) {
  return (
    <div className="border-base-300 -my-4 flex shrink-0 flex-row gap-1 overflow-x-auto border-b whitespace-nowrap">
      <TabLink to="/sport">All</TabLink>
      <TabLink to="/sport/calendar">Personal</TabLink>
      {isTrainer ? <TabLink to="/sport/trainer">Trainer</TabLink> : null}
      <ExternalTabLink href={SPORT_BOT_URL}>
        <span className="inline-flex items-center gap-1">
          <span className="icon-[ic--baseline-telegram] text-base" />
          Bot
        </span>
      </ExternalTabLink>
      <ExternalTabLink href={SPORT_WEBSITE_URL}>🔗 Website</ExternalTabLink>
      <TabLink to="/sport/faq">FAQ</TabLink>
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
