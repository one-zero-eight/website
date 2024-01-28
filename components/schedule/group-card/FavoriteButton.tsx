import Tooltip from "@/components/common/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { useUsersGetMe } from "@/lib/events";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const router = useRouter();
  const { switchFavorite, isInFavorites, isPredefined } =
    useEventGroup(groupId);
  const { data: user, isError } = useUsersGetMe();

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
          if (isError || !user) {
            router.push("/account/sign-in");
          } else {
            switchFavorite && switchFavorite();
          }
        }}
        className="w-52 h-52 p-2 -mr-2 rounded-2xl text-4xl text-icon-main/50 hover:bg-secondary-hover hover:text-icon-hover/75"
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
