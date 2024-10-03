import { useMe } from "@/api/accounts/user.ts";
import { SignInModal } from "@/components/account/SignInModal.tsx";
import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/lib/events/event-group";
import { useState } from "react";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const { switchFavorite, isInFavorites, isPredefined } =
    useEventGroup(groupId);
  const { me } = useMe();
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  return (
    <>
      <Tooltip
        content={
          isPredefined
            ? "Your group from official lists"
            : isInFavorites
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
          className="-mr-2 h-52 w-52 rounded-2xl p-2 text-4xl text-icon-main/50 hover:bg-secondary-hover hover:text-icon-hover/75"
        >
          {isPredefined ? (
            <span className="icon-[material-symbols--stars-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
          ) : isInFavorites ? (
            <span className="icon-[material-symbols--star] text-[#F0B132]" />
          ) : (
            <span className="icon-[material-symbols--star-outline]" />
          )}
        </button>
      </Tooltip>
      <SignInModal open={signInModalOpen} onOpenChange={setSignInModalOpen} />
    </>
  );
}
