import { useMe } from "@/api/accounts/user.ts";
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
        className="hover:bg-base-300 absolute top-0 right-0 flex rounded-xl p-0.5"
      >
        <span
          className="icon-[material-symbols--chevron-left-rounded] text-base-content/30 text-2xl"
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
        <div className="mb-2.5 flex w-full items-center justify-center border-b border-b-gray-500/20 p-2.5">
          <Link to="/" className="flex place-self-center">
            <Logo
              className={clsx(!isMinimized ? "mt-2 size-16" : "mt-2 size-10")}
            />
          </Link>
        </div>

        <div className="flex flex-col">
          {items.map((item, index) =>
            item.type === "separator" ? (
              <div
                key={index}
                className="my-2 h-px w-full shrink-0 rounded-full bg-gray-500/20"
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
        </div>

        <div className="my-4 flex grow" />

        {/* Social links */}
        <div
          className={clsx(
            "flex place-self-center",
            !isMinimized ? "flex-row gap-2" : "flex-col",
          )}
        >
          <a
            href="https://github.com/one-zero-eight"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-base300 rounded-field flex items-center justify-center p-1.5"
          >
            <span className="icon-[mdi--github] text-base-content/70 text-2xl" />
          </a>
          <a
            href="https://t.me/one_zero_eight"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-base-300 rounded-field flex items-center justify-center p-1.5"
          >
            <span className="icon-[uil--telegram-alt] text-base-content/70 text-2xl" />
          </a>
        </div>

        {/* Leave feedback button */}
        <LeaveFeedbackButton isMinimized={isMinimized} className="mb-4" />
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
        <div className="in-[.is-active]:selected text-base-content/50 ml-2 flex w-fit items-center text-base font-normal whitespace-nowrap in-[.is-active]:font-medium">
          {title}
        </div>
      )}
      {!isMinimized && (props.type === "external" || !!badge) && (
        <div className="text-base-content/50 flex w-min grow items-center justify-end">
          {props.type === "external" && (
            <span className="icon-[material-symbols--open-in-new-rounded] ml-2 text-sm" />
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
          "text-base-content/50 flex w-full rounded-xl py-0.5 select-none hover:bg-gray-500/10",
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
          "text-base-content/50 flex w-full rounded-md py-0.5 select-none hover:bg-gray-500/10",
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
