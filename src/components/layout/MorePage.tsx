import { useMe } from "@/api/accounts/user.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton.tsx";
import UserMenu from "@/components/layout/UserMenu.tsx";
import { ExternalLink, items, LocalLink } from "@/lib/links/menu-links.tsx";
import { Link } from "@tanstack/react-router";
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
        <div className="flex grow"></div>
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
              className="my-1 h-0.5 w-full shrink-0 rounded-full bg-gray-500/20"
            />
          ) : // Hide Forms item for non-staff users
          !(item.staff_only && !me?.innopolis_sso?.is_staff) ? (
            <MenuLink key={index} {...item} />
          ) : null,
        )}

      <LeaveFeedbackButton />
    </div>
  );
}

function MenuLink({ icon, title, badge, ...props }: LocalLink | ExternalLink) {
  const children = (
    <>
      {icon}
      <div className="[.is-active_&]:selected ml-4 flex w-fit items-center whitespace-nowrap text-lg font-semibold text-inactive">
        {title}
      </div>
      {(props.type === "external" || !!badge) && (
        <div className="flex w-min grow items-center">
          {props.type === "external" && (
            <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-base" />
          )}
          {badge}
        </div>
      )}
    </>
  );

  if (props.type === "external") {
    return (
      <a
        className={clsx(
          "flex w-full select-none rounded-xl py-2 text-inactive hover:bg-gray-500/10",
          "px-4 text-4xl",
        )}
        {...props}
      >
        {children}
      </a>
    );
  } else if (props.type === "local") {
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
        {children}
      </Link>
    );
  }
}
