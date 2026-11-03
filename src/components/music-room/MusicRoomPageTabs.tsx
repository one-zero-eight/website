import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import { ReactNode } from "react";

const MUSIC_ROOM_BOT_URL = "aHR0cHM6Ly90Lm1lL0lubm9NdXNpY1Jvb21Cb3Q=";
const MUSIC_ROOM_CHAT_URL = "aHR0cHM6Ly90Lm1lLytLWXhsMi1lMWUtYzRZemd5";

export function MusicRoomPageTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/music-room">
        <Trans>Calendar</Trans>
      </TabLink>
      <TabLink to="/music-room/instructions">
        <Trans>Instructions</Trans>
      </TabLink>
      <ExternalTabLink href={MUSIC_ROOM_BOT_URL}>
        <span className="inline-flex items-center gap-1">
          <span className="icon-[ic--baseline-telegram] text-base" />
          <Trans>Bot</Trans>
        </span>
      </ExternalTabLink>
      <ExternalTabLink href={MUSIC_ROOM_CHAT_URL}>
        <span className="inline-flex items-center gap-1">
          <span className="icon-[ic--baseline-telegram] text-base" />
          <Trans>Chat</Trans>
        </span>
      </ExternalTabLink>
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
    <button
      type="button"
      onClick={() => {
        const url = atob(href);
        window.open(url, "_blank");
      }}
      className="px-2 py-2.5"
    >
      {children}
    </button>
  );
}
