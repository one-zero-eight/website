import Tooltip from "@/components/common/Tooltip.tsx";
import { useMe } from "@/api/accounts/user.ts";
import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton.tsx";
import UserMenu from "@/components/layout/UserMenu.tsx";
import { items } from "@/lib/links/menu-links.tsx";
import { Link, LinkOptions } from "@tanstack/react-router";
import clsx from "clsx";

export function MorePage() {
  const { me } = useMe();

  return (
    <div className="flex min-h-full flex-col items-start justify-start">
      {/* Social links */}
      <div className="flex w-full gap-2 px-2">
        <Tooltip content="GitHub">
          <a
            href="https://github.com/one-zero-eight"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
          >
            <span className="icon-[mdi--github] text-3xl text-inactive" />
          </a>
        </Tooltip>
        <Tooltip content="Telegram">
          <a
            href="https://t.me/one_zero_eight"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
          >
            <span className="icon-[uil--telegram-alt] text-3xl text-inactive" />
          </a>
        </Tooltip>
        <Tooltip content="YouTube">
          <a
            href="https://www.youtube.com/@one-zero-eight"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
          >
            <span className="icon-[hugeicons--youtube] text-3xl text-inactive" />
          </a>
        </Tooltip>
        <div className="flex grow"></div>
        <LeaveFeedbackButton />
        <SwitchThemeButton />
        <UserMenu isMobile={false} isSidebar={false} />
      </div>
      <div className="my-1 h-0.5 w-full rounded-full bg-gray-500/20" />

      {items
        .filter((item) => !item.hideOnMore)
        .map((item, index) =>
          item.type === "separator" ? (
            <div
              key={index}
              className="my-1 h-0.5 w-full rounded-full bg-gray-500/20"
            />
          ) : // Hide Forms item for non-staff users
          item.type === "local" &&
            item.title === "Forms" &&
            !me?.innopolis_sso?.is_staff ? null : item.type === "local" ? (
            <MenuLink
              key={index}
              title={item.title}
              badge={item.badge}
              icon={item.icon}
              to={item.to}
            />
          ) : (
            <MenuLink
              key={index}
              title={item.title}
              badge={item.badge}
              icon={item.icon}
              to={item.link}
              external={true}
            />
          ),
        )}
    </div>
  );
}

function MenuLink({
  icon,
  title,
  badge,
  external,
  ...props
}: LinkOptions & {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      className={clsx(
        "flex w-full select-none rounded-xl py-2 text-inactive hover:bg-gray-500/10",
        "[&.is-active]:text-brand-violet",
        "px-4 text-4xl",
      )}
      activeProps={{ className: "is-active" }}
      {...props}
    >
      {icon}
      <div className="[.is-active_&]:selected ml-4 flex w-fit items-center whitespace-nowrap text-lg font-semibold text-inactive">
        {title}
      </div>
      {(!!external || !!badge) && (
        <div className="flex w-min grow items-center">
          {external && (
            <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-base" />
          )}
          {badge}
        </div>
      )}
    </Link>
  );
}
