import { getSignOutUrl } from "@/api/accounts/paths.ts";
import { useMe } from "@/api/accounts/user.ts";
import { SignInButtonIcon } from "@/components/common/SignInButton";
import { SidebarContext } from "@/components/layout/Sidebar";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useContext, useState } from "react";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const { me } = useMe();
  const [isOpen, setIsOpen] = useState(false);
  const { setOpened: setSidebarOpened } = useContext(SidebarContext);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-end",
    middleware: [offset(0), flip(), shift()],
  });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const click = useClick(context);
  const dismiss = useDismiss(context);
  // Role props for screen readers
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  if (!me) {
    return (
      <SignInButtonIcon
        onClick={() => {
          setIsOpen(false);
          setSidebarOpened(false);
        }}
      />
    );
  }

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="rounded-2xl hover:bg-primary-hover"
      >
        <div className="ml-auto flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
            <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-4xl" />
          </div>
        </div>
      </button>

      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...transitionStyles }}
              {...getFloatingProps()}
              className={clsx(
                "absolute z-10 w-fit rounded-2xl border-2 border-border/50 bg-popup p-4",
                isMobile
                  ? "left-0 top-[18p]"
                  : isSidebar
                    ? "-top-32"
                    : "right-0 top-[18p]",
              )}
            >
              <div className="flex flex-row justify-center gap-6 sm:justify-normal">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-border text-icon-main/50">
                  <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex h-20 flex-col justify-center">
                    <p className="text-xl text-text-main">
                      {me?.innopolis_sso?.name}{" "}
                    </p>
                    <p className="text-sm text-text-secondary/75">
                      {me?.innopolis_sso?.email}
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => {
                      setIsOpen(false);
                      setSidebarOpened(false);
                    }}
                    className="flex w-full flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-border px-6 py-2 text-center text-text-main/75 hover:bg-border-hover"
                  >
                    <span className="icon-[material-symbols--account-circle] text-2xl" />
                    My dashboard
                  </Link>
                  <button
                    onClick={() => {
                      window.location.assign(getSignOutUrl());
                      setIsOpen(false);
                      setSidebarOpened(false);
                    }}
                    className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-border px-6 py-2 text-center text-text-main/75 hover:bg-border-hover"
                  >
                    <span className="icon-[material-symbols--logout] text-2xl" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export default UserMenu;
