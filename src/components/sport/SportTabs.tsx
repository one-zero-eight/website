import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import type { ReactNode } from "react";

const SPORT_BOT_URL = "https://t.me/IUSportBot";
const SPORT_ADMIN_URL = "https://sport.innopolis.university/admin/";

export function SportTabs() {
  const { isTrainer, isAdmin } = useSportProfile();

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/sport">
        <Trans>Calendar</Trans>
      </TabLink>
      <TabLink to="/sport/history">
        <Trans>History</Trans>
      </TabLink>
      <TabLink to="/sport/profile">
        <Trans>Profile</Trans>
      </TabLink>
      {isTrainer ? (
        <TabLink to="/sport/trainer">
          <Trans>Trainer</Trans>
        </TabLink>
      ) : null}
      <TabLink to="/sport/info">
        <Trans>Info</Trans>
      </TabLink>
      <ExternalTabLink href={SPORT_BOT_URL}>
        <span className="inline-flex items-center gap-1">
          <span className="icon-[ic--baseline-telegram] text-base" />
          <Trans>Bot</Trans>
        </span>
      </ExternalTabLink>
      {isAdmin ? (
        <ExternalTabLink href={SPORT_ADMIN_URL}>
          <Trans>Admin</Trans>
        </ExternalTabLink>
      ) : null}
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-3 py-2.5"
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
    <a href={href} className="px-3 py-2.5" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
