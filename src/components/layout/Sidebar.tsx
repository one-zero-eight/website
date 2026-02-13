import { useMe } from "@/api/accounts/user.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import { items, LinkItemType } from "@/components/layout/menu-links.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useLocalStorage } from "usehooks-ts";
import Logo from "../icons/Logo";

export default function Sidebar() {
  const [isMinimized, setMinimized] = useLocalStorage(
    "sidebar-minimized",
    false,
  );
  const { me } = useMe();

  return (
    <aside className="bg-base-200 sticky top-0 hidden h-full shrink-0 overflow-x-hidden overflow-y-auto lg:flex">
      {/* Chevron to minimize/maximize the desktop sidebar */}
      <button
        type="button"
        onClick={() => setMinimized((v) => !v)}
        className="hover:bg-inh-secondary absolute top-0 right-0 flex rounded-xl p-0.5"
      >
        <span
          className="icon-[material-symbols--chevron-left-rounded] text-inh-inactive text-2xl"
          style={{
            transform: isMinimized ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Menu items */}
      <div
        className={clsx(
          "flex min-h-full flex-col items-start justify-start",
          !isMinimized ? "px-2" : "px-1",
        )}
      >
        <div className="mb-0.75 flex h-[64px] w-full items-center justify-center border-b-2 border-b-gray-500/20">
          <Link to="/" className="flex place-self-center">
            <Logo
              className={clsx(!isMinimized ? "mt-2 size-14" : "mt-2 size-10")}
            />
          </Link>
        </div>

        {items.map((item, index) =>
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
            <SidebarLink key={index} isMinimized={isMinimized} {...item} />
          ) : null,
        )}

        <div className="flex grow"></div>

        {/* About page button */}
        <Link
          to="/about"
          className={clsx(
            "text-base-content/70 mb-1 flex w-full items-center justify-center rounded-xl select-none hover:bg-gray-500/10",
            "[&.is-active]:text-primary",
          )}
          activeProps={{ className: "is-active" }}
        >
          <span
            className={clsx(
              "flex items-center gap-1.5 font-medium",
              isMinimized ? "text-[10px]" : "text-base",
            )}
          >
            {/*About <Logo108 className={isMinimized ? "h-3" : "h-3.5"} />*/}
            About 108
          </span>
        </Link>

        {/* Leave feedback button */}
        <LeaveFeedbackButton isMinimized={isMinimized} />

        {/* Social links */}
        <div
          className={clsx(
            "mb-2 flex place-self-center",
            !isMinimized ? "flex-row gap-2" : "flex-col",
          )}
        >
          <Tooltip content="GitHub">
            <a
              href="https://github.com/one-zero-eight"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-1"
            >
              <span className="icon-[mdi--github] text-base-content/70 text-2xl" />
            </a>
          </Tooltip>
          <Tooltip content="Telegram">
            <a
              href="https://t.me/one_zero_eight"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-1"
            >
              <span className="icon-[uil--telegram-alt] text-base-content/70 text-2xl" />
            </a>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  icon,
  title,
  badge,
  isMinimized,
  ...props
}: LinkItemType & {
  isMinimized: boolean;
}) {
  const children = (
    <>
      {icon}
      {!isMinimized && (
        <div className="in-[.is-active]:selected text-base-content/70 ml-2 flex w-fit items-center text-base font-normal whitespace-nowrap in-[.is-active]:font-medium">
          {title}
        </div>
      )}
      {!isMinimized && (props.type === "external" || !!badge) && (
        <div className="flex w-min grow items-center">
          {props.type === "external" && (
            <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
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
          "text-base-content/70 flex w-full rounded-xl py-0.5 select-none hover:bg-gray-500/10",
          !isMinimized ? "px-2 text-2xl" : "justify-center px-0.5 text-2xl",
        )}
        target="_blank"
        rel="nofollow noreferrer"
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
          "text-base-content/70 flex w-full rounded-xl py-0.5 select-none hover:bg-gray-500/10",
          "[&.is-active]:text-primary",
          !isMinimized ? "px-2 text-2xl" : "justify-center px-0.5 text-2xl",
        )}
        activeProps={{ className: "is-active" }}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }
}
