import { useMe } from "@/api/accounts/user.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton.tsx";
import UserMenu from "@/components/layout/UserMenu.tsx";
import { items, LinkItemType } from "@/components/layout/menu-links.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import ToggleSnowButton from "./ToggleSnowButton";

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
            className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-2"
          >
            <span className="icon-[mdi--github] text-base-content/70 text-3xl" />
          </a>
        </Tooltip>
        <Tooltip content="Telegram">
          <a
            href="https://t.me/one_zero_eight"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-2"
          >
            <span className="icon-[uil--telegram-alt] text-base-content/70 text-3xl" />
          </a>
        </Tooltip>
        <div className="flex grow"></div>
        <ToggleSnowButton />
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
          !(
              item.staff_only &&
              !(
                me?.innopolis_sso?.is_staff ||
                me?.id === "65f6ef2847289ea08482e3bf" ||
                !import.meta.env.VITE_PRODUCTION
              )
            ) ? (
            <MenuLink key={index} {...item} />
          ) : null,
        )}

      <LeaveFeedbackButton isMorePage={true} />
    </div>
  );
}

function MenuLink({ icon, title, badge, ...props }: LinkItemType) {
  const children = (
    <>
      {icon}
      <div className="in-[.is-active]:selected text-base-content/70 ml-2 flex w-fit items-center text-base font-normal whitespace-nowrap">
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
          "text-base-content/70 flex w-full rounded-xl py-2 select-none hover:bg-gray-500/10",
          "px-4 text-2xl",
        )}
        href={props.href}
      >
        {children}
      </a>
    );
  } else if (props.type === "local") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { staff_only, hideOnMore, type, ...linkProps } = props;
    return (
      <Link
        className={clsx(
          "text-base-content/70 flex w-full rounded-xl py-2 select-none hover:bg-gray-500/10",
          "[&.is-active]:text-primary",
          "px-4 text-2xl",
        )}
        activeProps={{ className: "is-active" }}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }
}
