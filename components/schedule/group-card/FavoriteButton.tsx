import Tooltip from "@/components/common/Tooltip";
import { useMe } from "@/lib/auth/user";
import { useEventGroup } from "@/lib/events/event-group";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const router = useRouter();
  const { switchFavorite, isInFavorites, isPredefined } =
    useEventGroup(groupId);
  const { me } = useMe();

  return (
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
          if (!me) {
            router.push("/account/sign-in");
          } else {
            switchFavorite && switchFavorite();
          }
        }}
        className="-mr-2 h-52 w-52 rounded-2xl p-2 text-4xl text-icon-main/50 hover:bg-secondary-hover hover:text-icon-hover/75"
      >
        {isPredefined ? (
          <span className="icon-[material-symbols--stars-outline] text-[#78DBE2]" />
        ) : isInFavorites ? (
          <span className="icon-[material-symbols--ac-unit-rounded] text-[#78DBE2]" />
        ) : (
          <span className="icon-[material-symbols--ac-unit-rounded]" />
        )}
      </button>
    </Tooltip>
  );
}
