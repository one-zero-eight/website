import { useMe } from "@/api/accounts/user.ts";
import { SignInModal } from "@/components/account/SignInModal.tsx";
import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/lib/events/event-group";
import { useState } from "react";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const { switchFavorite, isFavorite, isPredefined } = useEventGroup(groupId);
  const { me } = useMe();
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  return (
    <>
      <Tooltip
        content={
          isPredefined
            ? "Your group from official lists"
            : isFavorite
              ? "In favorites"
              : "Add to favorites"
        }
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!me) {
              setSignInModalOpen(true);
            } else {
              switchFavorite?.();
            }
          }}
          className="-mr-2 flex h-12 w-12 items-center justify-center rounded-2xl text-4xl text-contrast/50 hover:bg-secondary-hover hover:text-contrast/75"
        >
          {isPredefined ? (
            <span className="icon-[material-symbols--stars-outline] text-[#78DBE2]" />
          ) : isFavorite ? (
            <span className="icon-[material-symbols--ac-unit-rounded] text-[#78DBE2]" />
          ) : (
            <span className="icon-[material-symbols--ac-unit-rounded]" />
          )}
        </button>
      </Tooltip>
      <SignInModal open={signInModalOpen} onOpenChange={setSignInModalOpen} />
    </>
  );
}
