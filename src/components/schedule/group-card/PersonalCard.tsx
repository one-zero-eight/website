import { useNavigate } from "@tanstack/react-router";
import { TargetForExport } from "@/api/events/types.ts";
import HideButtonPersonal from "@/components/schedule/personal-card/HideButtonPersonal.tsx";
import SimpleExportButton from "@/components/schedule/group-card/SimpleExportButton.tsx";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton.tsx";

export type PersonalCardProps = {
  name: React.ReactNode;
  description: React.ReactNode;
  targetType: TargetForExport;
  exportUrl?: string;
  pageUrl?: string;
  canHide?: boolean;
  exportButtonOnClick?: () => void;
};

export function PersonalCard({
  name,
  description,
  pageUrl,
  targetType,
  exportButtonOnClick,
  canHide = true,
}: PersonalCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-inh-primary hover:bg-inh-primary-hover rounded-box flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between p-4"
      onClick={() => pageUrl && navigate({ to: pageUrl })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-inh-inactive">{description}</p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        <SimpleExportButton onClick={exportButtonOnClick} />
        {canHide && <HideButtonPersonal target={targetType} />}
        <LinkIconButton
          href={targetTypes[targetType].href}
          icon={<span className={targetTypes[targetType].iconClassName} />}
          tooltip={targetTypes[targetType].tooltip}
        />
      </div>
    </div>
  );
}

const targetTypes: Record<
  TargetForExport,
  { href: string; iconClassName: string; tooltip: string }
> = {
  [TargetForExport.sport]: {
    href: "https://t.me/IUSportBot",
    iconClassName:
      "icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70 mb-1",
    tooltip: "Open Telegram bot",
  },
  [TargetForExport.music_room]: {
    href: "https://t.me/InnoMusicRoomBot",
    iconClassName:
      "icon-[mdi--robot-excited-outline] text-[#F0B132] dark:text-[#F0B132]/70 mb-1",
    tooltip: "Open Telegram bot",
  },
  [TargetForExport.moodle]: {
    href: "/extension",
    iconClassName:
      "icon-[material-symbols--extension-outline] text-[#F0B132] dark:text-[#F0B132]/70",
    tooltip: "Install the browser extension to sync Moodle calendar",
  },
  [TargetForExport.room_bookings]: {
    href: "/room-booking",
    iconClassName:
      "icon-[material-symbols--door-open-outline-rounded] text-[#F0B132] dark:text-[#F0B132]/70",
    tooltip: "Navigate to room booking page",
  },
  [TargetForExport.workshops]: {
    href: "/events",
    iconClassName:
      "icon-[material-symbols--campaign-rounded] text-[#F0B132] dark:text-[#F0B132]/70",
    tooltip: "Open Telegram bot",
  },
};
