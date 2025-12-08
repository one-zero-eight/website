import { navigateToSignOut } from "@/api/accounts/sign-in.ts";
import { useMe } from "@/api/accounts/user.ts";
import { SignInButtonIcon } from "@/components/common/SignInButton";
import Tooltip from "@/components/common/Tooltip.tsx";
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
import { useState } from "react";

type UserMenuProps = {
  isMobile: boolean;
  isSidebar: boolean;
};
function UserMenu({ isMobile, isSidebar }: UserMenuProps) {
  const { me } = useMe();
  const [isOpen, setIsOpen] = useState(false);

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
    return <SignInButtonIcon onClick={() => setIsOpen(false)} />;
  }

  return (
    <>
      <Tooltip content="User profile">
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-2"
        >
          <span className="icon-[material-symbols--snowboarding-rounded] text-inh-inactive text-3xl" />
        </button>
      </Tooltip>

      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...transitionStyles }}
              {...getFloatingProps()}
              className={clsx(
                "border-inh-primary/50 bg-base-200 rounded-box absolute z-10 w-fit border-2 p-4",
                isMobile
                  ? "top-[18p] left-0"
                  : isSidebar
                    ? "-top-32"
                    : "top-[18p] right-0",
              )}
            >
              <div className="flex flex-row justify-center gap-6 sm:justify-normal">
                <div className="bg-inh-primary text-base-content/50 flex h-20 w-20 shrink-0 items-center justify-center overflow-clip rounded-full">
                  {me.telegram?.photo_url ? (
                    <img
                      src={me.telegram.photo_url}
                      alt="Your avatar"
                      className="border-base-content/50 rounded-full border-2"
                    />
                  ) : (
                    <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex h-20 flex-col justify-center">
                    <p className="text-base-content text-xl">
                      {me?.innopolis_sso?.name}{" "}
                    </p>
                    <p className="text-base-content/75 text-sm">
                      {me?.innopolis_sso?.email}
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="bg-inh-primary text-base-content/75 hover:bg-inh-secondary-hover rounded-box flex w-full flex-row items-center justify-center gap-2 px-6 py-2 text-center whitespace-nowrap"
                  >
                    <span className="icon-[material-symbols--account-circle] text-2xl" />
                    My dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      navigateToSignOut();
                      setIsOpen(false);
                    }}
                    className="bg-inh-primary text-base-content/75 hover:bg-inh-secondary-hover rounded-box flex w-full cursor-pointer flex-row items-center justify-center gap-2 px-6 py-2 text-center whitespace-nowrap"
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
